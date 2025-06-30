// FAILED인 캐시백을 다시 시도하는 로직 포함 
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Payment } from 'src/payment/entities/payment.entity';
import { Repository, LessThan } from 'typeorm';
import { PaymentStatus } from 'src/common/enums/payment-status.enum';
import { CashbackStatus } from 'src/common/enums/cashback-status.enum';
import { CashbackService } from '../cashback.service';

@Injectable()
export class CashbackRetryService {
    constructor(
        @InjectRepository(Payment)
        private readonly paymentRepository: Repository<Payment>,
        private readonly cashbackService: CashbackService
    ) { }

    async retryFailedCashbacks(): Promise<void> {
        const failedPayments = await this.paymentRepository.find({
            where: {
                status: PaymentStatus.SUCCESS,
                cashbackStatus: CashbackStatus.FAILED,
                retryCount: LessThan(3), // MAX_RETRY_COUNT 값과 일치하게 조정
            },
        });

        for (const payment of failedPayments) {
            await this.cashbackService.processSingleCashback(payment);
        }
    }
}