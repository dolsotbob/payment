import {
    Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
    Index, ManyToOne, JoinColumn, BeforeInsert, BeforeUpdate,
} from 'typeorm';
import { CashbackStatus } from '../../common/enums/cashback-status.enum';
import { Payment } from '../../payment/entities/payment.entity';

@Entity('cashback_entries')
@Index(['walletAddress'])
@Index(['status'])
@Index(['payment']) // FK 기반 조회
export class Cashback {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'walletAddress', type: 'varchar', length: 64 })
    walletAddress: string; // 적립/지급 대상 지갑 (소문자 normalize 권장)

    // 어떤 결제와 연동된 캐시백인지(선택)
    @ManyToOne(() => Payment, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'paymentId' })
    payment?: Payment | null;

    // 표시/감사용: 적용된 캐시백 비율(bps). 없으면 null
    @Column({ name: 'rateBps', type: 'int', nullable: true })
    rateBps?: number | null;

    // 적립은 +, 차감은 - (반드시 문자열로 다루세요)
    @Column({ name: 'amountWei', type: 'numeric', precision: 78, scale: 0 })
    amountWei!: string;

    // 지급 상태
    @Column({
        name: 'status',
        type: 'enum',
        enum: CashbackStatus,
        default: CashbackStatus.PENDING,
    })
    status!: CashbackStatus;

    // 실제 지급 트랜잭션(있으면)
    @Column({ name: 'txHash', type: 'varchar', length: 66, nullable: true })
    txHash?: string | null;

    @Column({ name: 'memo', type: 'text', nullable: true })
    memo?: string | null;

    @CreateDateColumn({ name: 'createdAt', type: 'timestamptz' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updatedAt', type: 'timestamptz' })
    updatedAt!: Date;

    @BeforeInsert()
    @BeforeUpdate()
    normalize() {
        if (this.walletAddress) this.walletAddress = this.walletAddress.toLowerCase();
        if (this.txHash) this.txHash = this.txHash.toLowerCase();
    }
}