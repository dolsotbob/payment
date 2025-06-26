// src/cashback/cashback.module.ts
import { Module } from '@nestjs/common';
import { CashbackService } from './cashback.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from '../payment/entities/payment.entity';
import { PaymentService } from '../payment/payment.service';

@Module({
    imports: [TypeOrmModule.forFeature([Payment])],
    providers: [CashbackService, PaymentService],
    exports: [CashbackService],
})
export class CashbackModule { }


// src/cashback/cashback.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from '../payment/entities/payment.entity';

@Injectable()
export class CashbackService {
    private readonly logger = new Logger(CashbackService.name);

    constructor(
        @InjectRepository(Payment)
        private readonly paymentRepository: Repository<Payment>
    ) { }

    async processCashbacks() {
        const pendingPayments = await this.paymentRepository.find({
            where: { status: PaymentStatus.SUCCESS, cashbackStatus: 'PENDING' },
        });

        for (const payment of pendingPayments) {
            try {
                // 👉 실제 캐시백 처리 로직 추가 필요 (예: contract 호출)

                // 처리 성공 시 상태 업데이트
                payment.cashbackStatus = 'SUCCESS';
                await this.paymentRepository.save(payment);

                this.logger.log(
                    `✅ 캐시백 완료: payment ID ${payment.id}, 사용자 ${payment.from}`
                );
            } catch (error) {
                payment.cashbackStatus = 'FAILED';
                await this.paymentRepository.save(payment);

                this.logger.error(
                    `❌ 캐시백 실패: payment ID ${payment.id}, 에러: ${error.message}`
                );
            }
        }
    }
}