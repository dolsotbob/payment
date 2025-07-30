// Auth 관련 의존성 모듈 (JwtModule, Strategy 등) 등록 

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';  // JWT를 발급하고 검증하는 기능 제공하는 NestJS의 모듈 
import { PassportModule } from '@nestjs/passport';  // NestJS의 미들웨어인 Passport 사용하기 위한 모듈
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';  // JWT 토큰을 검증하고, 유저 정보를 복원하는 Passport 전략 클래스
import { LoginHistoryModule } from 'src/login-history/login-history.module';

import { UserModule } from 'src/user/user.module';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    PassportModule, // Passport 전략 활성화 

    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (ConfigService: ConfigService) => ({
        secret: ConfigService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
      inject: [ConfigService],
    }),

    UserModule,
    LoginHistoryModule
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [JwtModule],
  /* 
  providers: 서비스, 전략 등 이 모듈의 의존성 주입 대상을 등록합니다.
  •	AuthService: 로그인/토큰 발급 로직
  •	JwtStrategy: 요청에 담긴 토큰을 검증
  •	UserService: 유저 정보 조회 (더미 유저 포함)
  */
})
export class AuthModule { }
