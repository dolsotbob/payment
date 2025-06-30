// NestJS에서 결제 관련 비즈니스 로직을 처리하는 파일
// 즉, 단순히 요청을 받는 것이 아니라 데이터베이스에 결제 기록을 저장하거나, 특정 조건에 따라 로직을 실행하는 등 실제 “일”을 하는 곳 
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentStatus } from 'src/common/enums/payment-status.enum';
import { CashbackStatus } from 'src/common/enums/cashback-status.enum';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()  // 이 클래스가 NestJS에서 의존성 주입 가능한 서비스임을 명시
// NestJS가 의존성 주입을 할 수 있도록 이 클래스를 서비스로 등록 
export class PaymentService {
  // 생성자: 의존성 주입 
  // Payment Entity에 대한 레포지토리(=DB 접근 도구)를 주입한다
  // 이 레포지토리는 DB에서 데이터를 생성, 읽기, 수정, 삭제 하는 데 사용됨 
  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
  ) { }

  // 결제 기록 생성 
  // POST /payment 요청 시 호출되는 함수 
  // 프론트앤드에서 받은 dto를 기반으로 결제 정보 저장 
  async create(createPaymentDto: CreatePaymentDto): Promise<Payment> {
    // DTO를 복사한 후 status: 'PENDING'을 추가해 DB에 저장할 객체를 만든다 
    // 아직 .save()는 하지 않는다 
    try {
      const payment = this.paymentRepository.create({
        ...createPaymentDto,
        status: createPaymentDto.status || PaymentStatus.PENDING,
        cashbackStatus: CashbackStatus.PENDING, // 아직 지급 안 됐으므로 
      });

      // 실제로 DB에 INSERT하고, 저장된 엔터티를 반환 
      return await this.paymentRepository.save(payment);
    } catch (error) {
      console.error('❌ 결제 생성 실패:', error);
      throw new HttpException('결제 생성 실패', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // 결제 상태 수정 (성공/실패) 
  async updateStatus(id: number, status: 'SUCCESS' | 'FAILED') {
    // 해당 ID의 결제 레코드를 찾아 status 값을 변경한다 
    await this.paymentRepository.update(id, { status: status as PaymentStatus });
    return this.paymentRepository.findOneBy({ id });  // 변경된 레코드 반환 
  }
}