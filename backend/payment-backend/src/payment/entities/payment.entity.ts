// 결제 정보를 어떻게 데이터베이스에 저장할지를 정의한 설계도 
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

@Entity()
export class Payment {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    account: string; // 결제자 지갑 주소

    @Column('decimal', { precision: 18, scale: 6 }) // 18 자리 중 6자리가 소수 
    amount: string; // 결제 금액 (문자열로 저장)

    @Column({ default: 'PENDING' })
    status: 'PENDING' | 'SUCCESS' | 'FAILED';

    @Column({ nullable: true })
    txHash: string; // 트랜잭션 해시

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
