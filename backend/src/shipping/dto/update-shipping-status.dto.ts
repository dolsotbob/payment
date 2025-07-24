// 배송 상태를 업데이트할 때 클라이언트가 보내는 요청 body 구조 정의 

import { IsEnum } from 'class-validator';
import { DeliveryStatus } from 'src/common/enums/delivery-status.enum';

export class UpdateShippingStatusDto {
    @IsEnum(DeliveryStatus)
    deliveryStatus: DeliveryStatus;
}