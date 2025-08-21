import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CouponsService } from './coupons.service';
import { CouponsController } from './coupons.controller';
import { CouponCatalog } from './entities/coupon-catalog.entity';
import { CouponUse } from './entities/coupon-use.entity';
import { BlockchainModule } from '../common/blockchain/blockchain.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([CouponCatalog, CouponUse]),
        BlockchainModule, // ← Erc1155Service import
    ],
    providers: [CouponsService],
    controllers: [CouponsController],
    exports: [CouponsService],
})
export class CouponsModule { }