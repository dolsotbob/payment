// src/coupons/coupons.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CouponsController } from './coupons.controller';
import { CouponsService } from './coupons.service';

// 쿠폰 사용 기록이 결제 도메인에 있다면 필요 엔티티만 이 모듈에서 등록
import { CouponUse } from './entities /coupon-use.entity';
// 다른 엔티티가 필요하면 여기 추가

@Module({
    imports: [
        TypeOrmModule.forFeature([CouponUse]),
    ],
    controllers: [CouponsController],
    providers: [CouponsService],
    exports: [CouponsService], // 다른 모듈에서 쓰면 export
})
export class CouponsModule { }