import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CouponsService } from './coupons.service';
import { CouponsController } from './coupons.controller';
import { CouponCatalog } from './entities/coupon-catalog.entity';
import { CouponUse } from './entities/coupon-use.entity';
import { BlockchainModule } from '../common/blockchain/blockchain.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([CouponCatalog, CouponUse]),
        BlockchainModule, // ← Erc1155Service import
        AuthModule,
    ],
    providers: [CouponsService],
    controllers: [CouponsController],
    exports: [CouponsService],
})
export class CouponsModule { }