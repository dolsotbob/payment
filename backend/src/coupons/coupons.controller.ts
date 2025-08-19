import { Controller, Get, Query } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { GetOwnedQueryDto, GetOwnedResponseDto } from './dto/get-owned.dto';

@Controller('coupons')
export class CouponsController {
    constructor(private readonly coupons: CouponsService) { }

    @Get('owned')
    async getOwned(@Query() q: GetOwnedQueryDto): Promise<GetOwnedResponseDto> {
        const items = await this.coupons.getOwned(q.wallet);
        return { wallet: q.wallet, items, fetchedAt: new Date().toISOString() };
    }
}