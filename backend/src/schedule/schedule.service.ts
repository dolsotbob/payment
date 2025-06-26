import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class ScheduleService {
    constructor(
        private readonly cashbackService: CashbackService,
    ) { }

    @Cron('*/30 * * * * *') // 30c초마다 실행 
    async handleCashbackSchedule() {
        await this.cashbackService.processCashbacks();
    }
}