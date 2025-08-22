// src/auth/dto/login.dto.ts
import { IsEthereumAddress, IsNotEmpty, IsString } from 'class-validator';

export class LoginRequestDto {
    @IsEthereumAddress()
    address!: string;

    @IsString()
    @IsNotEmpty()
    message!: string;

    @IsString()
    @IsNotEmpty()
    signature!: string;
}