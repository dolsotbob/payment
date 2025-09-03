// dto/update-payment-status.dto.ts
import { IsEnum } from 'class-validator';
import { PaymentStatus } from 'src/common/enums/payment-status.enum';

// 결제 상태 업데이트 요청 DTO
export class UpdatePaymentStatusDto {
    // 'SUCCESS' | 'FAILED' 문자열이 와도 enum으로 검증/매핑
    @IsEnum(PaymentStatus)
    status: PaymentStatus;
}