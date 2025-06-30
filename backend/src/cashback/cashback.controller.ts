// src/cashback/cashback.controller.ts

import { Controller, Get, Post } from '@nestjs/common';
import { CashbackService } from './cashback.service';

@Controller('cashback')
export class CashbackController {
    constructor(private readonly cashbackService: CashbackService) { }

    @Post('check-and-cashback')
    async checkAndChargeCashback() {
        return await this.cashbackService.checkAndCharge();
    }

    @Get('reserve')
    getVaultCashbackReserve() {
        return this.cashbackService.getReserve();   // getCashbackReserve 호출 
    }
}
