// src/cashback/cashback.module.ts
// NestJS에서 캐시백 관련 기능을 모듈 단위로 구성하고, 서비스를 외부에 공개하거나 내부에서 관리하기 위해 만든 설정 파일
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from '../payment/entities/payment.entity';
import { CashbackService } from './cashback.service';
import { CashbackController } from './cashback.controller';
import { CashbackRetryService } from './retry/cashback-retry.service';

@Module({
    imports: [TypeOrmModule.forFeature([Payment])], // Payment 엔터티의 Repository 주입 
    providers: [CashbackService, CashbackRetryService], // 이 모듈이 관리할 서비스 등록 
    controllers: [CashbackController],
    exports: [CashbackService, CashbackRetryService], // 외부 모듈에서도 사용할 수 있게 export 
})
export class CashbackModule { }
