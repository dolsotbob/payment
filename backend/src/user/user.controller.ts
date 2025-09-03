import { Request as ExpressRequest } from 'express';
import { Controller, Get, UseGuards, Request as Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

interface JwtPayload {
    walletAddress: string;
}

@Controller('user')
export class UserController {
    @UseGuards(AuthGuard('jwt'))  // 보호된 API 
    @Get('me')
    getProfile(@Req() req: ExpressRequest & { user: JwtPayload }) {
        return {
            walletAddress: req.user.walletAddress, // JwtStrategy에서 리턴한 값이 여기에 담김
        };
    }
}