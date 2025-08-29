// src/coupons/coupons.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Erc1155Service } from '../common/blockchain/erc1155.service';
import { CouponCatalog } from './entities/coupon-catalog.entity';
import { CouponUse } from './entities/coupon-use.entity';

import { OwnedCoupon } from './types/owned-coupon.type';
import { UseCouponDto } from './dto/use-coupon.dto';

type ValidateWithProductResult = {
    ok: boolean;
    reason?: string;
    discountBps?: number;
    priceCapUsd?: number;
    priceAfter?: string; // wei 문자열
};

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
        const balances = balanceStrs.map((s) => {
            try {
                return BigInt(s ?? '0');
            } catch {
                return 0n;
            }
        });

        const items: OwnedCoupon[] = [];
        for (let i = 0; i < ids.length; i++) {
            const tokenId = ids[i];
            const bal = balances[i] ?? 0n;
            if (bal === 0n) continue;

            const cat = catalogs.find((c) => Number(c.tokenId) === tokenId);
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
                    // 프론트에서 숫자 보정 중이긴 하지만 여기서도 최대한 숫자로 맞춰줌
                    discountBps:
                        (cat as any).discountBps ??
                        (cat as any).discount_bps ??
                        0,
                    // 필드 혼재 대응
                    isConsumable:
                        (cat as any).isConsumable ??
                        (cat as any).consumable ??
                        false,
                    priceCapUsd:
                        (cat as any).priceCapUsd ??
                        (cat as any).price_cap_usd ??
                        0,
                    expiresAt: (() => {
                        const v = (cat as any).expiresAt ?? (cat as any).expires_at;
                        if (!v) return '';
                        const d = v instanceof Date ? v : new Date(v);
                        return Number.isFinite(d.getTime()) ? d.toISOString() : '';
                    })(),
                },
            } as any);
        }
        return items;
    }

    /** 사용 가능 여부: 카탈로그 존재 + isActive + 잔고 >= amount */
    async canUse(address: string, tokenId: number, amount = 1): Promise<{ ok: boolean; reason?: string }> {
        const addr = this.addr(address);

        const catalog = await this.catalogRepo.findOne({
            where: { tokenId: Number(tokenId) as any },
        });
        if (!catalog) return { ok: false, reason: 'CATALOG_NOT_FOUND' };
        if (!catalog.isActive) return { ok: false, reason: 'DISABLED' };

        // 만료 체크(있으면)
        const rawExp = (catalog as any).expiresAt ?? (catalog as any).expires_at;
        if (rawExp) {
            const exp = rawExp instanceof Date ? rawExp : new Date(rawExp);
            if (Number.isFinite(exp.getTime()) && exp.getTime() < Date.now()) {
                return { ok: false, reason: 'EXPIRED' };
            }
        }

        const [balanceStr] = await this.erc1155.balanceOfBatch(addr, [tokenId]);
        let bal = 0n;
        try {
            bal = BigInt(balanceStr ?? '0');
        } catch {
            bal = 0n;
        }

        if (bal < BigInt(amount)) return { ok: false, reason: 'NOT_ENOUGH_BALANCE' };
        return { ok: true };
    }

    /**
      * ✅ 상품 단위 검증 + 할인액 계산(optional)
      * - catalog 활성/만료/잔고 체크
      * - 상품 제한(allowedProductIds/allowedProductId)이 있으면 검사
      * - discountBps가 있고 priceWei가 주어지면 priceAfter 계산하여 반환
      */
    async canUseWithProduct(
        address: string,
        couponId: number,
        opts: { productId: string; amount?: number; priceWei?: string },
    ): Promise<ValidateWithProductResult> {
        const { productId, amount = 1, priceWei } = opts;
        const addr = this.addr(address);

        const catalog = await this.catalogRepo.findOne({
            where: { tokenId: Number(couponId) as any },
        });
        if (!catalog) return { ok: false, reason: 'CATALOG_NOT_FOUND' };
        if (!(catalog as any).isActive) return { ok: false, reason: 'DISABLED' };

        // 만료 체크
        const rawExp = (catalog as any).expiresAt ?? (catalog as any).expires_at;
        if (rawExp) {
            const exp = rawExp instanceof Date ? rawExp : new Date(rawExp);
            if (Number.isFinite(exp.getTime()) && exp.getTime() < Date.now()) {
                return { ok: false, reason: 'EXPIRED' };
            }
        }

        // 잔고 체크
        const [balanceStr] = await this.erc1155.balanceOfBatch(addr, [Number(couponId)]);
        let bal = 0n;
        try {
            bal = BigInt(balanceStr ?? '0');
        } catch {
            bal = 0n;
        }
        if (bal < BigInt(amount)) return { ok: false, reason: 'NOT_ENOUGH_BALANCE' };

        // 상품 제한(선택): 컬럼 예시 - allowedProductIds(JSON/CSV) 또는 allowedProductId(단일)
        const allowedListRaw =
            (catalog as any).allowedProductIds ??
            (catalog as any).allowed_product_ids ??
            null;
        const allowedSingle =
            (catalog as any).allowedProductId ??
            (catalog as any).allowed_product_id ??
            null;

        let productAllowed = true;
        if (allowedSingle) {
            productAllowed = String(allowedSingle) === String(productId);
        } else if (allowedListRaw) {
            // JSON 배열 또는 콤마 문자열 모두 허용
            let list: string[] = [];
            if (Array.isArray(allowedListRaw)) list = allowedListRaw.map(String);
            else if (typeof allowedListRaw === 'string')
                list = allowedListRaw.split(',').map((s) => s.trim());
            productAllowed = list.includes(String(productId));
        }
        if (!productAllowed) {
            return { ok: false, reason: 'PRODUCT_NOT_ALLOWED' };
        }

        // 할인 정보 구성
        const discountBps: number =
            (catalog as any).discountBps ??
            (catalog as any).discount_bps ??
            0;
        const priceCapUsd: number | undefined =
            (catalog as any).priceCapUsd ??
            (catalog as any).price_cap_usd ??
            undefined;

        const result: ValidateWithProductResult = {
            ok: true,
            discountBps,
            priceCapUsd,
        };

        // 프론트가 priceAfter를 원하면 계산 (priceWei가 넘어온 경우)
        if (priceWei && Number.isFinite(discountBps)) {
            try {
                const price = BigInt(priceWei);
                const discount = (price * BigInt(discountBps)) / 10_000n;
                const after = price > discount ? price - discount : 0n;
                result.priceAfter = after.toString();
            } catch {
                // priceWei가 BigInt로 변환 불가하면 계산 생략
            }
        }

        return result;
    }

    /**
     * 적용(오프체인 기록만 저장)
     * - 중복 방지: Unique(walletAddress, couponId, txHash)
     * - 온체인 트랜잭션이 없으므로 txHash에 offchain 키를 사용
     */
    async apply(dto: UseCouponDto, authUser: { address: string }) {
        const wallet = String((authUser as any)?.address ?? (authUser as any)?.sub ?? '').toLowerCase();
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