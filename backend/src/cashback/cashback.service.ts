import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Payment } from '../payment/entities/payment.entity'; // Payment Entity import
import { Repository } from 'typeorm'; // TypeORM Repository
import { PaymentStatus } from 'src/common/enums/payment-status.enum'; // 결제 상태 enum
import { CashbackStatus } from 'src/common/enums/cashback-status.enum'; // 캐시백 상태 enum
import { ethers } from 'ethers';
import * as dotevn from 'dotenv';
import PaymentWoithCashbackAbi from './PaymentWithCashback.json';

@Injectable()
export class CashbackService {
    private readonly logger = new Logger(CashbackService.name);
    // NestJS 로거 사용 (출력 시 "CashbackService" 태그로 표시됨)

    constructor(
        @InjectRepository(Payment)
        private readonly paymentRepository: Repository<Payment>,
        // Payment 테이블에 접근하기 위한 DB Repository 주입
    ) { }

    async processCashbacks(): Promise<void> {
        // 1. 아직 캐시백이 처리되지 않은 결제 건들 조회
        const payments = await this.paymentRepository.find({
            where: {
                status: PaymentStatus.SUCCESS, // 결제는 성공했고
                cashbackStatus: CashbackStatus.PENDING, // 캐시백은 아직 안 된 건
            },
        });

        // 2. 하나씩 캐시백 처리
        for (const payment of payments) {
            try {
                // TODO: 실제 스마트 컨트랙트 호출 또는 지갑에서 전송 로직 추가 예정
                // 예: ethers.js로 contract.payback() 호출 등

                payment.cashbackStatus = CashbackStatus.COMPLETED; // 상태 변경
                await this.paymentRepository.save(payment); // DB에 저장
                this.logger.log(`✅ 캐시백 완료: ${payment.id}`);
            } catch (error) {
                this.logger.error(`❌ 캐시백 실패: ${payment.id}`, error);
                payment.cashbackStatus = CashbackStatus.FAILED;
                await this.paymentRepository.save(payment);
            }
        }
    }
}