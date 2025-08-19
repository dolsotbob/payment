import { Injectable } from '@nestjs/common';
import { Erc1155Service } from '../common/blockchain/erc1155.service';
import { OwnedCoupon } from './types/owned-coupon.type';

// In real code, import repositories (CouponUse etc) to mark USED/disabled

@Injectable()
export class CouponsService {
    constructor(private readonly erc1155: Erc1155Service) { }

    async getOwned(wallet: string): Promise<OwnedCoupon[]> {
        // 1) candidate IDs: from config or indexer; for MVP hardcode [1..5]
        const ids = [1, 2, 3, 4, 5];
        const balances = await this.erc1155.balanceOfBatch(wallet, ids);

        const items: OwnedCoupon[] = [];
        for (let i = 0; i < ids.length; i++) {
            const id = ids[i];
            const bal = BigInt(balances[i] ?? '0');
            if (bal === 0n) continue;

            // TODO: fetch metadata via uri(id) and http fetch; parse rules
            const rule = { discountBps: 500, consumable: true };
            items.push({ id, balance: Number(bal), status: 'ACTIVE', rule });
        }
        // TODO: merge DB flags: DISABLED/USED_UP/EXPIRED
        return items;
    }
}