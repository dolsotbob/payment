// DB 모델 설계 
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { DeliveryStatus } from 'src/common/enums/delivery-status.enum';

@Entity()
export class ShippingInfo {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    @Index()
    userAddress: string; // 지갑 주소

    @Column()
    recipientName: string;

    @Column()
    phoneNumber: string;

    @Column()
    address: string;

    @Column({ type: 'enum', enum: DeliveryStatus, default: DeliveryStatus.Ready })
    deliveryStatus: DeliveryStatus;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}