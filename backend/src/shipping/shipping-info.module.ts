import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShippingInfo } from './entities/shipping-info.entity';
import { ShippingInfoController } from './shipping.controller';
import { ShippingService } from './shipping.service';

@Module({
    imports: [TypeOrmModule.forFeature([ShippingInfo])], // TypeORM 연결 
    controllers: [ShippingInfoController],
    providers: [ShippingService],
    exports: [TypeOrmModule],  // 다른 모듈에서 사용할 수 있도록 
})
export class ShippingInfoModule { }