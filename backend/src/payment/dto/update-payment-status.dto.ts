// dto/update-payment-status.dto.ts
import { IsIn } from 'class-validator';

export class UpdatePaymentStatusDto {
    @IsIn(['SUCCESS', 'FAILED'])
    status: 'SUCCESS' | 'FAILED';
}