// src/auth/dto/create-login-history.dto.ts

import { IsString, IsOptional, IsEthereumAddress } from 'class-validator';

export class CreateLoginHistoryDto {
    @IsString()
    ipAddress: string;

    @IsOptional()
    @IsString()
    userAgent?: string;
}