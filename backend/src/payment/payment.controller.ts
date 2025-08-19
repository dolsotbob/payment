import { Controller, Post, Body, Patch, Param, Get, Query, BadRequestException } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { QuoteRequestDto, QuoteResponseDto } from './dto/quote.dto';
import { CheckoutRequestDto, CheckoutResponseDto } from './dto/checkout.dto';
import { CashbackStatus } from 'src/common/enums/cashback-status.enum';

// 이 클래스는 /payment 경로의 API 요청을 처리하는 컨트롤러임을 나타낸다 
@Controller('payment')
// PaymentController 클래스 정의 시작 
export class PaymentController {
  // PaymentService를 의존성 주입(DI)하여 이 컨트롤러에서 사용할 수 있게 한다 
  constructor(private readonly paymentService: PaymentService) { }

  // 결제 정보를 새로 생성
  // POST /payment
  // Relayer 서버에서 결제 정보 전송 시 사용
  @Post()
  create(@Body() createPaymentDto: CreatePaymentDto) {
    console.log('💡 수신된 결제 요청:',);  // 확인 로그
    return this.paymentService.create(createPaymentDto);
  }

  // 결제 상태 업데이트 
  // HTTP PATCH 요청이 /payment/:id/status 경로로 들어올 때 실행된다 
  @Patch(':id/status')
  // URL의 id 값을 문자열로 받아오고,
  // 요청 본문에서 status 값을 받아옵니다. 상태는 'SUCCESS' 또는 'FAILED' 중 하나여야 한다 
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdatePaymentStatusDto,
  ) {
    // 해당 결제의 상태를 업데이트한다 
    return this.paymentService.updateStatus(+id, updateStatusDto.status);
  }

  // 결제 내역 조회 (지갑 주소 기준)
  @Get()
  async findByUser(@Query('user') user?: string) {
    const payments = await this.paymentService.findByUser(user.toLowerCase());

    return payments.map((p) => ({
      id: p.id,
      from: p.from,

      // 금액들(wei, 문자열)
      originalPrice: p.originalPrice?.toString() ?? '0',
      discountAmount: p.discountAmount?.toString() ?? '0',
      discountedPrice: p.discountedPrice?.toString() ?? '0', // 최종 결제액
      cashbackAmount: p.cashbackAmount?.toString() ?? '0',

      // 상품 정보
      productId: p.productId ?? null,
      productName: p.product?.name ?? '이름 없음', // 프론트용 이름 포함
      productImage: p.product?.imageUrl ?? '',

      // 상태/메타 
      status: p.status,
      CashbackStatus: p.cashbackStatus,
      txHash: p.txHash,
      createdAt: p.createdAt,
    }));
  }

  @Post('quote')
  quote(@Body() body: QuoteRequestDto): Promise<QuoteResponseDto> {
    return this.paymentService.quote(body);
  }

  @Post('checkout')
  checkout(@Body() body: CheckoutRequestDto): Promise<CheckoutResponseDto> {
    return this.paymentService.checkout(body);
  }
}

