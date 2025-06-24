
// 아래 한 줄은 NestJS의 데코레이터와 요청 해늗ㄹ러 관련 모듈을 가져온다 
// @Controller: 컨트롤러 정의
// @Post, @Patch: HTTP 요청 메서드 핸들러
// @Body, @Param: 요청 데이터 추출
import { Controller, Post, Body, Patch, Param } from '@nestjs/common';
// 결제 관련 비즈니스 로직이 담긴 서비스 파일을 가져온다 
import { PaymentService } from './payment.service';
// 클라이언트가 결제 요청 시 보낼 데이터 형식을 정의한 DTO를 가져온다 
import { CreatePaymentDto } from './dto/create-payment.dto';

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
  create(@Body() createPaymentDto: CreatePaymentDto) {
    // 받은 데이터를 paymentService.create()에 전달하여 결제를 생성한다 
    return this.paymentService.create(createPaymentDto);
  }

  // 결제 상태 업데이트 
  // HTTP PATCH 요청이 /payment/:id/status 경로로 들어올 때 실행된다 
  @Patch(':id/status')
  // URL의 id 값을 문자열로 받아오고,
  // 요청 본문에서 status 값을 받아옵니다. 상태는 'SUCCESS' 또는 'FAILED' 중 하나여야 한다 
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: 'SUCCESS' | 'FAILED',
  ) {
    // id는 문자열이므로 숫자로 변환(+id)해서 paymentService.updateStatus() 메서드에 전달한다
    // 해당 결제의 상태를 업데이트한다 
    return this.paymentService.updateStatus(+id, status);
  }
}