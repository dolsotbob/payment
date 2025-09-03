// src/product/dto/create-product.dto.ts

import { IsString, IsNumberString, IsOptional, IsUrl } from 'class-validator';

export class CreateProductDto {
    @IsString()
    name: string;

    // wei 문자열 
    @IsNumberString()
    priceWei: string;

    @IsString()
    imageUrl: string;

    @IsOptional()
    @IsString()
    hoverImageUrl?: string; // optional
}