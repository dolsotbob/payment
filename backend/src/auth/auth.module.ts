// Auth 관련 의존성 모듈 (JwtModule, Strategy 등) 등록
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';

import { LoginHistoryModule } from 'src/login-history/login-history.module';
import { UserModule } from 'src/user/user.module';
import { LoginChallenge } from './entities/login-challenge.entity';

@Module({
  imports: [
    // 전역 설정 
    ConfigModule.forRoot({ isGlobal: true }),

    // Passport 전략 활성화 
    PassportModule,

    // TypeORM: challenge 저장소 주입
    TypeOrmModule.forFeature([LoginChallenge]),

    // JWT
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (ConfigService: ConfigService) => ({
        secret: ConfigService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
      inject: [ConfigService],
    }),

    // 도메인 모듈 
    UserModule,
    LoginHistoryModule
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  // 필요 시 JwtModule/PassportModule 둘 다 export
  exports: [JwtModule, PassportModule],
})
export class AuthModule { }
