import { IsString, IsNumber, IsNotEmpty, Matches, IsOptional, IsISO8601, IsEnum } from 'class-validator';
import { PaymentStatus } from 'src/common/enums/payment-status.enum';

export class CreatePaymentDto {
    @IsString()
    @IsNotEmpty()
    txHash: string;  // 트랜잭션 해시 (블록체인에 결제한 기록)

    @IsNotEmpty()
    @IsNumber()
    productId: number;

    @IsString()
    @IsNotEmpty()
    from: string;

    @IsString()
    @IsNotEmpty()
    @Matches(/^\d+$/, { message: 'amount는 숫자 문자열(정수 wei 단위)이어야 합니다.' })
    amount: string; // decimal은 문자열로 처리; 결제 금액 (wei 단위)

    @IsOptional()
    @Matches(/^\d+$/, { message: 'cashbackAmount는 숫자 문자열(wei 단위)이어야 합니다.' })
    cashbackAmount?: string;

    @IsOptional()
    @IsString()
    gasUsed?: string;

    @IsOptional()
    @IsString()
    gasCost?: string;

    @IsEnum(PaymentStatus, { message: 'status는 SUCCESS 또는 FAILED 중 하나여야 합니다.' })
    status: PaymentStatus;
}