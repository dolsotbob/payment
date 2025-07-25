import { Controller, Post, Body, Get, Patch, Param } from '@nestjs/common';
import { ShippingService } from './shipping.service';
import { CreateShippingInfoDto } from './dto/create-shipping-info.dto';
import { ShippingInfo } from './entities/shipping-info.entity';
import { UpdateShippingStatusDto } from './dto/update-shipping-status.dto';
import { ParseIntPipe } from '@nestjs/common';

@Controller('shipping-info')

export class ShippingInfoController {
    constructor(private readonly shippingService: ShippingService) { }

    @Post()
    createShippingInfo(@Body() dto: CreateShippingInfoDto): Promise<ShippingInfo> {
        return this.shippingService.createShippingInfo(dto);
    }

    @Get(':userAddress')
    getShippingInfo(@Param('userAddress') userAddress: string): Promise<ShippingInfo | null> {
        return this.shippingService.getShippingInfoByUser(userAddress);
    }

    @Patch(':id')
    updateShippingInfo(
        @Param('id', ParseIntPipe) orderId: number,
        @Body() dto: UpdateShippingStatusDto
    ): Promise<ShippingInfo> {
        return this.shippingService.updateShippingInfo(orderId, dto);
    }
}
