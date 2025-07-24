// DB 모델 설계 
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { DeliveryStatus } from 'src/common/enums/delivery-status.enum';

@Entity()
export class ShippingInfo {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    userAddress: string; // 지갑 주소

    @Column()
    recipientName: string;

    @Column()
    phoneNumber: string;

    @Column()
    address: string;

    @Column()
    deliveryStatus: DeliveryStatus;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}