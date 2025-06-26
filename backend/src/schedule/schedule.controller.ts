// schedule.controller.ts
import { Controller, Post } from '@nestjs/common';
import { ScheduleService } from '../schedule/schedule.service';

@Controller('schedule')
export class ScheduleController {
    constructor(private readonly scheduleService: ScheduleService) { }

    @Post('trigger-cashback')
    async triggerCashback() {
        await this.scheduleService.handleCashbackSchedule();
        return { message: 'Cashback triggered manually' };
    }
}