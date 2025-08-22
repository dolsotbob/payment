// src/coupons/coupons.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Erc1155Service } from '../common/blockchain/erc1155.service';
import { CouponCatalog } from './entities/coupon-catalog.entity';
import { CouponUse } from './entities/coupon-use.entity';

import { OwnedCoupon } from './types/owned-coupon.type';
import { UseCouponDto } from './dto/use-coupon.dto';

@Injectable()
export class CouponsService {
    constructor(
        private readonly erc1155: Erc1155Service,
        @InjectRepository(CouponCatalog)
        private readonly catalogRepo: Repository<CouponCatalog>,
        @InjectRepository(CouponUse)
        private readonly useRepo: Repository<CouponUse>,
    ) { }

    private addr(a: string) {
        return (a ?? '').toLowerCase();
    }

    /** 보유 쿠폰 조회: 카탈로그 tokenId 기준으로 배치 조회 */
    async getOwned(wallet: string): Promise<OwnedCoupon[]> {
        const address = this.addr(wallet);

        // 활성/비활성 모두 보이게 하려면 find(); 활성만이면 where: { isActive: true }
        const catalogs = await this.catalogRepo.find();
        const ids = catalogs.map(c => Number(c.tokenId)).filter(Number.isFinite);
        if (ids.length === 0) return [];

        const balanceStrs = await this.erc1155.balanceOfBatch(address, ids);
        const balances = balanceStrs.map(s => { try { return BigInt(s ?? '0'); } catch { return 0n; } });

        const items: OwnedCoupon[] = [];
        for (let i = 0; i < ids.length; i++) {
            const tokenId = ids[i];
            const bal = balances[i] ?? 0n;
            if (bal === 0n) continue;

            const cat = catalogs.find(c => Number(c.tokenId) === tokenId);
            if (!cat) continue;

            items.push({
                id: tokenId,
                balance: Number(bal),
                status: cat.isActive ? 'ACTIVE' : 'DISABLED',
                meta: {
                    name: cat.name ?? null,
                    imageUrl: cat.imageUrl ?? null,
                    ipfsCid: cat.ipfsCid ?? null,
                },
                rule: {
                    discountBps: 0,
                    consumable: false,
                    priceCapUsd: 0,
                    expiresAt: ''
                }
            });
        }
        return items;
    }

    /** 사용 가능 여부: 카탈로그 존재 + isActive + 잔고 >= amount */
    async canUse(address: string, tokenId: number, amount = 1): Promise<{ ok: boolean; reason?: string }> {
        const addr = this.addr(address);

        const catalog = await this.catalogRepo.findOne({ where: { tokenId } });
        if (!catalog) return { ok: false, reason: 'CATALOG_NOT_FOUND' };
        if (!catalog.isActive) return { ok: false, reason: 'DISABLED' };

        const [balanceStr] = await this.erc1155.balanceOfBatch(addr, [tokenId]);
        let bal = 0n;
        try { bal = BigInt(balanceStr ?? '0'); } catch { bal = 0n; }

        if (bal < BigInt(amount)) return { ok: false, reason: 'NOT_ENOUGH_BALANCE' };
        return { ok: true };
    }

    /**
     * 적용(오프체인 기록만 저장)
     * - 중복 방지: Unique(walletAddress, couponId, txHash)
     * - 온체인 트랜잭션이 없으므로 txHash에 offchain 키를 사용
     */
    async apply(dto: UseCouponDto, authUser: { address: string }) {
        const wallet = (authUser.address ?? '').toLowerCase();
        const tokenId = Number(dto.couponId);
        const amount = Number(dto.amount ?? 1);

        // 보유량 체크 (카탈로그 isActive + balance >= amount)
        const check = await this.canUse(wallet, tokenId, amount);
        if (!check.ok) throw new BadRequestException(check.reason ?? 'COUPON_NOT_APPLICABLE');

        // offchain tx 식별자 규칙
        const txHash = `offchain:${dto.paymentId}`;

        const use = this.useRepo.create({
            walletAddress: wallet,
            couponId: tokenId,
            txHash,                 // 필수 컬럼이므로 offchain 규칙으로 저장
            quoteId: dto.paymentId,   // 선택: quoteId에 orderId를 복제 저장(원자적 연계용)
            usedAt: new Date(),
            // payment: null,        // 결제 엔티티 연계가 생기면 여기에 연결
        });

        // 유니크 충돌(중복 요청) 시 에러가 던져집니다.
        return this.useRepo.save(use);
    }
}