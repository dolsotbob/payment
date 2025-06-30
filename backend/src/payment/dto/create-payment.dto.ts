// 프론트엔드에서 POST 요청으로 들어온 결제 정보를
// NestJS가 타입 확인 및 유효성 검사를 하기 위한 DTO (Data Transfer Object)
// class-validator의 데코레이터를 이용해 필수 필드, 타입 등을 엄격하게 검사함
// @Body() createPaymentDto: CreatePaymentDto로 컨트롤러에 전달됨

import { IsString, IsNumber, IsNotEmpty, Matches, IsOptional, IsISO8601, IsEnum } from 'class-validator';
import { PaymentStatus } from 'src/common/enums/payment-status.enum';
import { Payment } from '../entities/payment.entity';

export class CreatePaymentDto {
    @IsString()
    @IsNotEmpty()
    txHash: string;  // 트랜잭션 해시 (블록체인에 결제한 기록)

    @IsString()
    @IsNotEmpty()
    from: string; // 결제한 사람 주소

    @IsString()
    @IsNotEmpty()
    @Matches(/^\d+$/, { message: 'amount는 숫자 문자열(정수 wei 단위)이어야 합니다.' })
    amount: string; // decimal은 문자열로 처리; 결제 금액 (wei 단위)

    @IsOptional()
    @Matches(/^\d+$/, { message: 'cashbackAmount는 숫자 문자열(wei 단위)이어야 합니다.' })
    cashbackAmount?: string;

    @IsEnum(PaymentStatus)
    status: PaymentStatus;

    @IsOptional()
    @IsISO8601()
    timestamp?: string; // ISO 8601 형식 ("2024-06-24T12:34:56Z")
}
