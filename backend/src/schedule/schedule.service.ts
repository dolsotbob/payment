// src/schedule/schedule.service.ts
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CashbackService } from 'src/cashback/cashback.service';
import { CashbackRetryService } from 'src/cashback/retry/cashback-retry.service';

@Injectable()
export class ScheduleService {
    constructor(
        private readonly cashbackService: CashbackService,
        private readonly retryService: CashbackRetryService
    ) { }

    @Cron('*/30 * * * * *') // 30초마다 실행
    async handleCashbackSchedule() {
        console.log('[Schedule] Cashback cron triggered:', new Date().toISOString());

        try {
            await this.cashbackService.checkAndCharge();   // 충전 먼저 처리 
            await this.cashbackService.processCashbacks();  // 지급 처리 
            await this.retryService.retryFailedCashbacks();
        } catch (error) {
            console.error('[Schedule] ❌ Error in scheduled cashback task:', error);
        }
    }
} 
