import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { LoginHistoryService } from './login-history.service';
import { CreateLoginHistoryDto } from './dto/create-login-history.dto';

@Controller('login-history')
export class LoginHistoryController {
    constructor(private readonly loginHistoryService: LoginHistoryService) { }

    // 로그인 기록 생성
    @Post()
    async create(@Body() dto: CreateLoginHistoryDto) {
        return this.loginHistoryService.create(dto);
    }

    // 특정 지갑 주소의 로그인 기록 조회
    @Get(':walletAddress')
    async findByWalletAddress(@Param('walletAddress') walletAddress: string) {
        return this.loginHistoryService.findByWalletAddress(walletAddress);
    }
}