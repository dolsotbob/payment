// src/cashback/cashback.controller.ts

import { Controller, Post } from '@nestjs/common';
import { CashbackService } from './cashback.service';

@Controller('schedule')
export class CashbackController {
    constructor(private readonly cashbackService: CashbackService) { }

    @Post('trigger-cashback')
    async triggerCashback() {
        await this.cashbackService.processCashbacks();
        return { message: 'Manual cashback triggered.' };
    }
}