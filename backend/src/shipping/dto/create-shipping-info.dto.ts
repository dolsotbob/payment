import { IsString, IsNotEmpty } from 'class-validator';

export class CreateShippingInfoDto {
    @IsString()
    @IsNotEmpty()
    userAddress: string;

    @IsString()
    @IsNotEmpty()
    recipientName: string;

    @IsString()
    @IsNotEmpty()
    phoneNumber: string;

    @IsString()
    @IsNotEmpty()
    address: string;
}