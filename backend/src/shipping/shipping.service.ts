import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from 'typeorm';

import { ShippingInfo } from "./entities/shipping-info.entity";
import { CreateShippingInfoDto } from "./dto/create-shipping-info.dto";
import { DeliveryStatus } from "src/common/enums/delivery-status.enum";

@Injectable()

export class ShippingService {
    // shippingRepo는 리포지토리 인스턴스를 저장할 변수
    private readonly shippingRepo: Repository<ShippingInfo>;

    constructor(
        // @InjectRepository(ShippingInfo)를 통해 TypeORM 리포지토리를 의존성 주입
        // “이 서비스에서 ShippingInfo DB 테이블을 다룰 리포지토리 객체가 필요해요. Nest야, 알아서 생성해서 넣어줘.”
        @InjectRepository(ShippingInfo)
        shippingRepo: Repository<ShippingInfo>,
    ) {
        // 생성자에서 this.shippingRepo에 주입된 리포지토리를 저장
        // NestJS가 주방이고, 리포지토리가 칼이라면, 생성자 파라미터로 받은 칼을 this.shippingRepo라는 서랍에 보관하는 것 
        this.shippingRepo = shippingRepo;
    }

    // 	DTO 기반으로 create() + save() → TypeORM 사용 방식 적절
    async createShippingInfo(dto: CreateShippingInfoDto): Promise<ShippingInfo> {
        const shipping = this.shippingRepo.create({ ...dto, deliveryStatus: DeliveryStatus.Ready });
        return this.shippingRepo.save(shipping);
    }

    async getShippingInfoByUser(userAddress: string): Promise<ShippingInfo[]> {
        return this.shippingRepo.find({ where: { userAddress }, order: { createdAt: 'DESC' }, });
    }

    async updateShippingInfo(id: number, update: Partial<ShippingInfo>): Promise<ShippingInfo> {
        await this.shippingRepo.update(id, update);
        return this.shippingRepo.findOneByOrFail({ id });
    }
}
