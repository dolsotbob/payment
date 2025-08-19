// src/coupon/entities/coupon-use.entity.ts
// 1회용/소모 추적의 근거 
import {
    Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
    ManyToOne, JoinColumn,
} from 'typeorm';
import { Payment } from '../../payment/entities/payment.entity';

@Entity('coupon_uses')
@Index(['walletAddress', 'couponId', 'txHash'], { unique: true })
export class CouponUse {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'walletAddress', type: 'varchar', length: 64 })
    walletAddress: string; // 소문자 normalize 권장

    @Column({ name: 'couponId', type: 'int' })
    couponId: number; // ERC1155 tokenId

    @Column({ name: 'txHash', type: 'varchar', length: 66 })
    txHash: string; // 쿠폰이 사용된 트랜잭션

    @Column({ name: 'quoteId', type: 'varchar', length: 100, nullable: true })
    quoteId?: string | null; // 원자적 consume 연계용

    @ManyToOne(() => Payment, { nullable: true, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'paymentId' })
    payment?: Payment | null;

    @CreateDateColumn({ name: 'usedAt', type: 'timestamptz' })
    usedAt: Date;
}