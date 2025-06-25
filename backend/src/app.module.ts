// app.module.ts는 NestJS 애플리케이션의 최상위 루트 모듈 
// 앱 전반에서 사용할 모듈, 설정, 환경변수, 데이터베이스 연결 등을 설정한다 

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
// ConfigModule은 .env 환경 변수 로드 
import { ConfigModule, ConfigService } from '@nestjs/config';

import { dbConfig } from './common/db/db.config';
import { PaymentModule } from './payment/payment.module';

@Module({
  imports: [
    // .env 파일을 불러와서 앱 전체에서 사용할 수 있게 한다 
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // TypeORM(PostgreSQL) 연결을 비동기 방식으로 설정
    // ConfigService를 사용해 .env에서 DB 정보 읽고 dbConfig 함수로 설정을 넘긴다 
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: dbConfig,
    }),

    // 결제 모듈 - 결제 관련 컨트롤러/서비스/엔터티 포함 
    // payment 폴더에 있는 결제 로직을 담당하는 모듈을 앱 전체에서 사용할 수 있도록 등록한다 
    PaymentModule,
  ],
})
export class AppModule { }
