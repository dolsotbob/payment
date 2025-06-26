// src/schedule/schedule.service.ts
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CashbackService } from 'src/cashback/cashback.service';

@Injectable()
export class ScheduleService {
    constructor(
        private readonly cashbackService: CashbackService,
    ) { }

    @Cron('*/30 * * * * *') // 30초마다 실행
    async handleCashbackSchedule() {
        await this.cashbackService.processCashbacks();
    }
} 
