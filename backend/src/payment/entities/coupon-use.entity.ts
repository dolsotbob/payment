import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('coupon_uses')
@Unique('uniq_wallet_coupon_tx', ['wallet', 'couponId', 'txHash'])
export class CouponUse {
    @PrimaryGeneratedColumn('uuid') id!: string;

    @Index()
    @Column({ length: 64 }) wallet!: string;

    @Column('int') couponId!: number;

    @Index()
    @Column({ length: 100 }) quoteId!: string; // tie to quote for atomic consume

    @Index({ unique: true })
    @Column({ length: 100 }) txHash!: string;

    @CreateDateColumn() usedAt!: Date;
}