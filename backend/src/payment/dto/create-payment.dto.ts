import { IsString, IsUUID, IsNumber, IsNotEmpty, Matches, IsOptional, IsEnum } from 'class-validator';
import { PaymentStatus } from 'src/common/enums/payment-status.enum';

const WEI_MSG = '값은 숫자 문자열(wei 단위 정수)이어야 합니다.';

export class CreatePaymentDto {
    @IsString()
    @IsNotEmpty()
    txHash: string;  // 트랜잭션 해시 (블록체인에 결제한 기록)

    // @IsNotEmpty()
    // @IsNumber()
    // productId: number;

    @IsUUID('4', { message: 'productId는 UUIDv4 문자열이어야 합니다.' })
    productId!: string;

    @IsString()
    @IsNotEmpty()
    from!: string;  // 지갑 주소 

    // ===== 금액(프론트 기준 명명) =====
    @IsString()
    @Matches(/^\d+$/, { message: `originalPrice ${WEI_MSG}` })
    originalPrice!: string;      // 원래 상품 가격(wei)

    @IsString()
    @Matches(/^\d+$/, { message: `discountAmount ${WEI_MSG}` })
    discountAmount!: string;     // 할인 금액(wei)

    @IsString()
    @Matches(/^\d+$/, { message: `discountedPrice ${WEI_MSG}` })
    discountedPrice!: string;    // 최종 지불 금액(wei)

    @IsOptional()
    @Matches(/^\d+$/, { message: `cashbackAmount ${WEI_MSG}` })
    cashbackAmount?: string;     // 캐시백 예정 금액(wei). 없으면 0으로 저장

    // ===== 가스 정보 =====
    @IsOptional()
    @Matches(/^\d+$/, { message: `gasUsed ${WEI_MSG}` })
    gasUsed?: string;

    @IsOptional()
    @Matches(/^\d+$/, { message: `gasCost ${WEI_MSG}` })
    gasCost?: string;

    // ===== 상태(선택) =====
    @IsOptional()
    @IsEnum(PaymentStatus, { message: 'status는 SUCCESS | FAILED | PENDING 중 하나여야 합니다.' })
    status?: PaymentStatus;
}