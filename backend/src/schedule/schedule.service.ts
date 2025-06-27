// src/schedule/schedule.service.ts
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CashbackService } from 'src/cashback/cashback.service';
import { CashbackRetryService } from 'src/cashback/retry/cashback-retry.service';

@Injectable()
export class ScheduleService {
    retryService: any;
    constructor(
        private readonly cashbackService: CashbackService, retryService: CashbackRetryService
    ) { }

    @Cron('*/30 * * * * *') // 30초마다 실행
    async handleCashbackSchedule() {
        console.log('[Schedule] Cashback cron triggered:', new Date().toISOString());
        await this.cashbackService.processCashbacks();
        await this.retryService.retryFailedCashbacks();
    }
} 
