import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
    @Get()
    healthCheck(): string {
        return 'OK'; // Render가 이 응답을 받으면 배포가 완료됩니다.
    }
}
