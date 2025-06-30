// schedule.controller.ts
// 이 trigger-cashback API는 수동으로 캐시백을 실행함. 
// 자동 캐시백은 @Cron()이 설정된 서비스에서 처리됨 
import { Controller, Post } from '@nestjs/common';
import { ScheduleService } from '../schedule/schedule.service';

@Controller('schedule')
export class ScheduleController {
    constructor(private readonly scheduleService: ScheduleService) { }

    @Post('trigger-cashback')
    async triggerCashback() {
        try {
            await this.scheduleService.handleCashbackSchedule();
            return { message: '✅ 캐시백이 수동으로 실행되었습니다.' };
        } catch (error: any) {
            console.error('❌ 캐시백 실행 실패:', error);
            return {
                message: '❌ 캐시백 실행 중 오류 발생',
                error: error?.message ?? 'Unknown error'
            };
        }
    }
}