// src/schedule/schedule_feature.module.ts
import { Module } from '@nestjs/common';
// NestJS에서 스케줄링 기능(Cron, Interval 등)을 제공하는 모듈을 import
import { ScheduleModule } from '@nestjs/schedule';
import { ScheduleService } from './schedule.service';
import { CashbackModule } from 'src/cashback/cashback.module';

@Module({
    imports: [
        ScheduleModule.forRoot(), // Cron을 NestJS에 활성화
        CashbackModule,           // CashbackService 주입 가능하게 함
    ],
    // providers는 서비스를 NestJS의 의존성 주입 시스템에 등록하기 위한 필드 
    // 이 모듈이 사용할 서비스 클래스를 providers에 등록
    // 이 서비스 내부에 @Cron() 등 주기 실행 로직이 들어 있음 
    providers: [ScheduleService],
})
export class ScheduleFeatureModule { }