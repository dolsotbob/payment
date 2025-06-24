import { IsString, IsNumber, IsNotEmpty } from 'class-validator';

export class CreatePaymentDto {
    @IsString()
    @IsNotEmpty()
    txHash: string;  // 트랜잭션 해시 (블록체인에 결제한 기록)

    @IsString()
    @IsNotEmpty()
    from: string; // 결제한 사람 주소

    @IsString()
    @IsNotEmpty()
    to: string; // 상점 지갑 주소

    @IsNumber()
    @IsNotEmpty()
    amount: string; // decimal은 문자열로 처리; 결제 금액 (wei 단위)
}
