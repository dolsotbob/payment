import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
    @Get()
    root(): string {
        return 'OK'; // Render가 이 응답을 받으면 배포가 완료됩니다.
    }

    @Get('/healthz')
    healthCheck(): string {
        return 'OK';
    }
}
