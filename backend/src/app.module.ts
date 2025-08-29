// app.module.ts는 NestJS 애플리케이션의 최상위 루트 모듈 
// 앱 전반에서 사용할 모듈, 설정, 환경변수, 데이터베이스 연결 등을 설정한다 

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
// ConfigModule은 .env 환경 변수 로드 
import { ConfigModule, ConfigService } from '@nestjs/config';

import { dbConfig } from './common/db/db.config';
import { AppController } from './app.controller';
import { UserModule } from './user/user.module';
import { ProductModule } from './product/product.module';
import { PaymentModule } from './payment/payment.module';
import { CouponsModule } from './coupons/coupons.module';
import { CashbackModule } from './cashback/cashback.module';

import { ScheduleModule } from '@nestjs/schedule';
import { ScheduleFeatureModule } from './schedule/schedule_feature.module';
import { ShippingInfoModule } from './shipping/shipping-info.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    // .env 파일을 불러와서 앱 전체에서 사용할 수 있게 한다 
    ConfigModule.forRoot({ isGlobal: true }),
    // TypeORM(PostgreSQL) 연결을 비동기 방식으로 설정
    // ConfigService를 사용해 .env에서 DB 정보 읽고 dbConfig 함수로 설정을 넘긴다 
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: dbConfig,
    }),

    // 도메인 모듈 
    UserModule,
    AuthModule,
    ProductModule,
    PaymentModule,  // 결제 정보 저장, 상태 업뎃 등 DB 조작 담당 
    CouponsModule,
    CashbackModule, // DB에서 캐시백 대상 조회 -> 스마트 컨트랙트 호출로 캐시백 처리 

    ScheduleModule.forRoot(), // // Cron을 NestJS에 활성화
    ScheduleFeatureModule,  // @Cron 스케줄러를 통해 주기적으로 CashbackService.processCashbacks() 실행 

    ShippingInfoModule,
  ],
  controllers: [AppController],
})
export class AppModule { }  // 전체 앱을 조립하고 모듈들을 연결 (최상위 루트)
