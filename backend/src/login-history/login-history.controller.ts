import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    UseGuards,
    Req,
    ValidationPipe,
} from '@nestjs/common';
import { LoginHistoryService } from './login-history.service';
import { CreateLoginHistoryDto } from './dto/create-login-history.dto';
import { AuthGuard } from '@nestjs/passport';
// (선택) class-validator가 동작하도록 main.ts에서 app.useGlobalPipes(...) 설정했으면 Body 파이프는 생략 가능

@Controller('login-history')
export class LoginHistoryController {
    constructor(private readonly loginHistoryService: LoginHistoryService) { }

    /** 로그인 기록 생성 */
    @Post()
    @UseGuards(AuthGuard('jwt'))
    create(
        @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
        dto: CreateLoginHistoryDto,
        @Req() req: any,
    ) {
        // req.user: { id: string, walletAddress?: string, ... }
        return this.loginHistoryService.writeLogin(dto, { id: req.user.id });
    }

    /** 특정 지갑 주소의 로그인 기록 조회 (user.walletAddress 기준) */
    @Get(':walletAddress')
    @UseGuards(AuthGuard('jwt')) // ← 민감 정보 노출 방지를 위해 조회도 보호 권장
    async findByWalletAddress(@Param('walletAddress') walletAddress: string) {
        // 서비스 내부에서 toLowerCase 처리하지만, 한 번 더 방어적으로 정규화
        return this.loginHistoryService.findByWalletAddress(walletAddress.trim());
    }

    /** (선택) 내 로그인 기록 조회: 주소를 노출하지 않고 사용자 본인 기준으로 조회 */
    @Get('me/history')
    @UseGuards(AuthGuard('jwt'))
    async myLoginHistory(@Req() req: any) {
        // 서비스에 findByUserId를 추가해 두면 더 깔끔합니다.
        // return this.loginHistoryService.findByUserId(req.user.id);
        // 임시로 walletAddress 기반을 쓰려면:
        return this.loginHistoryService.findByWalletAddress(req.user.walletAddress);
    }
}