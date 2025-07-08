// 모듈 정의 
// 결제 기능(payment)에 필요한 구성 요소들을 Nest 애플리케이션에 연결해주는 역할을 한다 
// 노트: NestJS에서는 기능 단위(결제, 사용자, 상품 등) 마다 *.module.ts 파일이 필수임 
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { Payment } from './entities/payment.entity';
import { ProductModule } from 'src/product/product.module';

// 이 파일이 Nest 모듈임을 선언 
@Module({
  imports: [
    TypeOrmModule.forFeature([Payment]), // 외부 모듈을 가져옴 → TypeOrmModule을 사용해 Payment 엔티티를 DB에 연결
    ProductModule, // ProductRepository를 여기서 가져옴 
  ],

  // 사용자의 요청을 처리하는 라우터 클래스 
  controllers: [PaymentController],
  // 비즈니스 로직을 담당하는 서비스 등록 
  providers: [PaymentService],
  // 다른 모듈에서 사용할 수 있도록 
  // exports: [PaymentService],
})
export class PaymentModule { }
