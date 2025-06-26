// DB 에서 결제는 완료 되었지만 캐시백이 아직 안 된 건들을 조회하고, 
// 이를 대상으로 실제 캐시백(스마트 컨트랙트 호출)을 수행하거나 실패로 기록한다 
// 스케줄링(@Cron)과 연결되어 주기적으로 자동 실행된다 
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Payment } from '../payment/entities/payment.entity'; // Payment Entity import
import { Repository } from 'typeorm'; // TypeORM Repository
import { PaymentStatus } from 'src/common/enums/payment-status.enum'; // 결제 상태 enum
import { CashbackStatus } from 'src/common/enums/cashback-status.enum'; // 캐시백 상태 enum
import { ethers } from 'ethers';
import * as dotevn from 'dotenv';
import PaymentWithCashbackAbi from '../abis/PaymentWithCashback.json';

dotevn.config();

// @Injectable()은 이 클래스가 NestJS의 의존성 주입 대상임을 나타내고, 
// 다른 클래스에서 CashbackService를 주입 받아 사용할 수 있게 해준다 
@Injectable()
export class CashbackService {
    // NestJS 로거 사용 (출력 시 "CashbackService" 태그로 표시됨)
    private readonly logger = new Logger(CashbackService.name);
    private contract: ethers.Contract;

    // constructor 역할: 
    // (1) NestJS의 의존성 주입
    // (2) ethers.js 기반 스마트 컨트랙트 인스턴스 생성 - 즉, 컨트랙트에 연결해 함수 호출이나 상태 조회 할 수 있는 통로 만들기 
    constructor(
        // TypeORM의 @InjectRepository 데코레이터로 Payment 엔터티용 Repository 주입
        @InjectRepository(Payment)
        // Payment 테이블에 접근하기 위한 DB Repository 주입
        private readonly paymentRepository: Repository<Payment>,
    ) {
        const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
        this.contract = new ethers.Contract(
            process.env.CONTRACT_ADDRESS!,
            PaymentWithCashbackAbi.abi,
            wallet
        );
    }

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
                // 🪙 캐시백 전송 (buyer 주소와 amount 전달)
                const tx = await this.contract.sendCashback(payment.from, payment.amount, {
                    gasLimit: 500_000,
                });
                const receipt = await tx.wait();

                // ✅ 성공 처리 
                payment.cashbackStatus = CashbackStatus.COMPLETED; // 상태 변경
                payment.cashbackTxHash = receipt.hash;
                await this.paymentRepository.save(payment); // DB에 저장
                this.logger.log(`✅ 캐시백 완료: ${payment.id} | Tx: ${receipt.hash}`);
            } catch (error) {
                payment.cashbackStatus = CashbackStatus.FAILED;
                await this.paymentRepository.save(payment);
                this.logger.error(`❌ 캐시백 실패: ${payment.id}`, error);
            }
        }
    }
}
