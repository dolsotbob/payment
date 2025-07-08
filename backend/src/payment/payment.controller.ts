import { Controller, Post, Body, Patch, Param, Get, Query } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';

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
  async findByUser(@Query('user') user: string) {
    const payments = this.paymentService.findByUser(user.toLowerCase());

    return (await payments).map((p) => ({
      id: p.id,
      from: p.from,
      amount: p.amount?.toString() ?? '0',
      cashbackAmount: p.cashbackAmount?.toString() ?? '0',
      productName: p.product?.name ?? '이름 없음', // 프론트용 이름 포함
      productImage: p.product?.imageUrl ?? '',
      status: p.status,
      txHash: p.txHash,
      createdAt: p.createdAt,
    }));
  }
}

