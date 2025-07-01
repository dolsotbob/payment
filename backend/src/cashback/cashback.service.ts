// DB 에서 결제는 완료 되었지만 캐시백이 아직 안 된 건들을 조회하고, 
// 이를 대상으로 실제 캐시백(스마트 컨트랙트 호출)을 수행하거나 실패로 기록한다 
// 스케줄링(@Cron)과 연결되어 주기적으로 자동 실행된다 
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Payment } from '../payment/entities/payment.entity'; // Payment Entity import
import { Repository, In, LessThan } from 'typeorm'; // TypeORM Repository
import { PaymentStatus } from 'src/common/enums/payment-status.enum'; // 결제 상태 enum
import { CashbackStatus } from 'src/common/enums/cashback-status.enum'; // 캐시백 상태 enum
import { ethers } from 'ethers';
import * as dotevn from 'dotenv';
import VaultAbi from '../abis/Vault.json';
import PaymentAbi from '../abis/Payment.json';

dotevn.config();

const MAX_RETRY_COUNT = 3;

// @Injectable()은 이 클래스가 NestJS의 의존성 주입 대상임을 나타내고, 
// 다른 클래스에서 CashbackService를 주입 받아 사용할 수 있게 해준다 
@Injectable()
export class CashbackService {
    // NestJS 로거 사용 (출력 시 "CashbackService" 태그로 표시됨)
    private readonly logger = new Logger(CashbackService.name);
    // private contract: ethers.Contract;
    private readonly provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    private readonly wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);

    private readonly paymentContract = new ethers.Contract(
        process.env.CONTRACT_ADDRESS!,
        PaymentAbi.abi,
        this.wallet
    );

    private readonly vaultContract = new ethers.Contract(
        process.env.VAULT_ADDRESS!,
        VaultAbi.abi,
        this.wallet
    );

    // constructor 역할:
    // (1) NestJS의 의존성 주입
    // (2) ethers.js 기반 스마트 컨트랙트 인스턴스 생성 - 즉, 컨트랙트에 연결해 함수 호출이나 상태 조회 할 수 있는 통로 만들기
    constructor(
        // TypeORM의 @InjectRepository 데코레이터로 Payment 엔터티용 Repository 주입
        @InjectRepository(Payment)
        // Payment 테이블에 접근하기 위한 DB Repository 주입
        private readonly paymentRepository: Repository<Payment>,
    ) { }

    // ✅ 캐시백 잔액이 기준 이하이면 자동으로 충전
    async checkAndCharge(): Promise<any> {
        try {
            const threshold = ethers.parseUnits(process.env.CASHBACK_THRESHOLD || '1000', 18);
            const topupAmount = ethers.parseUnits(process.env.CASHBACK_TOPUP_AMOUNT || '2000', 18);

            const currentReserve: bigint = await this.vaultContract.getCashbackReserve();
            console.log(currentReserve);

            this.logger.log(`💰 현재 캐시백 잔액: ${ethers.formatUnits(currentReserve, 18)} TEST`);

            if (currentReserve < threshold) {
                this.logger.warn(`⚠️ 잔액 부족 → ${ethers.formatUnits(topupAmount, 18)} TEST 충전 시도`);

                const approveTx = await this.approveTopup(topupAmount);
                await approveTx.wait();

                // 서버 지갑의 allowance, balance 조회 
                const token = new ethers.Contract(
                    process.env.TOKEN_ADDRESS!,
                    [
                        'function allowance(address owner, address spender) view returns (uint256)',
                        'function balanceOf(address owner) view returns (uint256)',
                    ],
                    this.wallet,
                );
                const allowance = await token.allowance(this.wallet.address, process.env.VAULT_ADDRESS!);
                const balance = await token.balanceOf(this.wallet.address);
                this.logger.log(`🧾 승인된 잔액: ${ethers.formatUnits(allowance, 18)} TEST`);
                this.logger.log(`💰 서버 지갑 잔액: ${ethers.formatUnits(balance, 18)} TEST`);

                // Vault의 실제 토큰 보유량 확인 
                const vaultBalance = await token.balanceOf(process.env.VAULT_ADDRESS!);
                this.logger.log(`🏦 Vault 실제 토큰 잔고: ${ethers.formatUnits(vaultBalance, 18)} TEST`);

                const chargeTx = await this.vaultContract.chargeCashback(topupAmount);
                await chargeTx.wait();

                this.logger.log(`✅ 캐시백 충전 완료: ${ethers.formatUnits(topupAmount, 18)} TEST`);
                return { success: true, charged: true };
            } else {
                this.logger.log('✅ 잔액 충분, 충전 생략');
                return { success: true, charged: false };
            }
        } catch (error: any) {
            this.logger.error('❌ 캐시백 충전 실패', error);
            return { success: false, error: error.message };
        }
    }

    // 🧾 ERC20 토큰에 대한 approve 실행
    private async approveTopup(amount: bigint) {
        const vaultAddr = process.env.VAULT_ADDRESS;
        if (!vaultAddr) throw new Error('VAULT_ADDRESS 환경변수 없음');

        const token = new ethers.Contract(
            process.env.TOKEN_ADDRESS!,
            [
                'function approve(address spender, uint256 amount) public returns (bool)'
            ],
            this.wallet
        );

        return await token.approve(vaultAddr, amount);
    }

    // ✅ DB에 쌓인 결제 건 중 캐시백 미처리된 것들 찾아 실행
    async processCashbacks(): Promise<void> {
        // 1. 아직 캐시백이 처리되지 않은 결제 건들 조회
        const payments = await this.paymentRepository.find({
            where: {
                status: PaymentStatus.SUCCESS, // 결제는 성공했고
                cashbackStatus: In([CashbackStatus.PENDING, CashbackStatus.FAILED]), // 캐시백은 아직 안 된 건 (FATAL은 제외)
                retryCount: LessThan(MAX_RETRY_COUNT),  // 재시도 초과된 건도 제외 
            },
        });

        // 2. 하나씩 캐시백 처리 - 아래 processSingleCashback 함수로 
        for (const payment of payments) {
            await this.processSingleCashback(payment);
        }
    }

    // 🔁 단일 결제 건에 대한 캐시백 실행 + DB 반영 (재시도에도 사용 가능)
    async processSingleCashback(payment: Payment): Promise<void> {
        // 재시도 제한 확인 
        const retryCount = payment.retryCount ?? 0;
        if (retryCount >= MAX_RETRY_COUNT) {
            this.logger.warn(`🚫 재시도 초과: ${payment.id}`);

            payment.cashbackStatus = CashbackStatus.FAILED;  // 상태를 바꿔줘야 크론에 제외되고 서버 재시작할 때 다시 재시도 하는거 안 함 
            await this.paymentRepository.save(payment);

            return;
        }

        try {
            // Payment 컨트랙트에 캐시백 위임 
            const tx = await this.paymentContract.executeProvideCashback(payment.from, payment.amount, {
                gasLimit: 500_000,
            });
            const receipt = await tx.wait();

            // ✅ 성공 처리 
            payment.cashbackStatus = CashbackStatus.COMPLETED; // 상태 변경
            payment.cashbackTxHash = receipt.hash;
            payment.retryCount = 0;
            await this.paymentRepository.save(payment); // DB에 저장

            this.logger.log(`✅ 캐시백 완료: ${payment.id} | Tx: ${receipt.hash}`);
        } catch (error) {
            payment.retryCount = retryCount + 1;
            payment.cashbackStatus =
                payment.retryCount >= MAX_RETRY_COUNT ? CashbackStatus.FATAL : CashbackStatus.FAILED;
            await this.paymentRepository.save(payment);

            this.logger.error(`❌ 캐시백 실패: ${payment.id} | 재시도" ${payment.retryCount}`, error);

            if (payment.cashbackStatus === CashbackStatus.FATAL) {
                this.logger.warn(`🚫 캐시백 영구 실패 처리됨: ${payment.id}`);
            }
        }
    }



    // Vault의 현재 캐시백 잔액을 조회하는 메서드 
    async getReserve(): Promise<string> {
        const reserve: bigint = await this.vaultContract.getCashbackReserve();
        return ethers.formatUnits(reserve, 18);
    }

    // // 추후 추가 
    //  private async handleFatalCashback(payment: Payment) {
    //     this.logger.warn(`📣 [FATAL 알림] 캐시백 실패 | ID: ${payment.id}`);

    //     // TODO: 추후 슬랙, 문자, 이메일 등 알림 연동
    //     // 예시
    //     // await this.slackService.notifyFatalCashback(payment);
    //     // await this.emailService.sendToAdmin(payment);
    // }
}



