import { Controller, Post, Body, Patch, Param } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';

// 이 클래스는 /payment 경로의 API 요청을 처리하는 컨트롤러임을 나타낸다 
@Controller('payment')
// PaymentController 클래스 정의 시작 
export class PaymentController {
  // PaymentService를 의존성 주입(DI)하여 이 컨트롤러에서 사용할 수 있게 한다 
  constructor(private readonly paymentService: PaymentService) { }

  // 결제 생성 
  // HTTP POST 요청이 /payment로 들어올 때 실행될 메서드임을 나타낸다 
  @Post()
  // 요청 본문(body)에 담긴 데이터를 createPaymentDto 객체로 받는다 
  async create(@Body() createPaymentDto: CreatePaymentDto) {
    // 받은 데이터를 paymentService.create()에 전달하여 결제를 생성한다 
    return await this.paymentService.create(createPaymentDto);
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
}