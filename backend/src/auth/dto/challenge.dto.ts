// src/auth/dto/challenge.dto.ts
import { IsEthereumAddress, IsInt, IsOptional } from 'class-validator';

export class ChallengeRequestDto {
    @IsEthereumAddress()
    address!: string;

    @IsOptional()
    @IsInt()
    chainId?: number;
}

