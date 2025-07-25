// src/product/dto/create-product.dto.ts

import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateProductDto {
    @IsString()
    name: string;

    @IsNumber()
    price: string;

    @IsString()
    imageUrl: string;

    @IsOptional()
    @IsString()
    hoverImageUrl?: string; // optional
}