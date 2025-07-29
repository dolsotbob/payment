import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

interface JwtPayload {
    userId: number;
    username: string;
}

@Controller('user')
export class UserController {
    @UseGuards(AuthGuard('jwt'))  // 보호된 API 
    @Get('me')
    getProfile(@Req() req) {
        return req.user.walletAddress; // JwtStrategy에서 리턴한 값이 여기에 담김
    }
}