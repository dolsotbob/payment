// src/auth/dto/create-login-history.dto.ts

import { IsString, IsOptional, IsEthereumAddress } from 'class-validator';

export class CreateLoginHistoryDto {
    @IsEthereumAddress()
    address: string; // 지갑 주소 (User 식별용)

    @IsString()
    ipAddress: string;

    @IsOptional()
    @IsString()
    userAgent?: string;
}