import { IsString, IsEthereumAddress } from 'class-validator';

export class LoginDto {
    @IsEthereumAddress()
    address: string;

    @IsString()
    message: string;

    @IsString()
    signature: string;
}