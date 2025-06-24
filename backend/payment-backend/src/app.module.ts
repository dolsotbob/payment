// app.module.ts는 NestJS 애플리케이션의 최상위 루트 모듈 

// 아래 두 줄은 삭제
// import { AppController } from './app.controller';
// import { AppService } from './app.service';

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { PaymentModule } from './payment/payment.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST,
      port: Number(process.env.DATABASE_PORT),
      username: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      autoLoadEntities: true,
      synchronize: true, // 개발 중만 true (배포 시 false)
    }),
    PaymentModule
  ],
  // 아래 두 줄도 삭제 
  // controllers: [AppController],
  // providers: [AppService],
})
export class AppModule { }
