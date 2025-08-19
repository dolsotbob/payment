// src/shipping-info/entities/shipping-info.entity.ts
import {
    Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index, BeforeInsert, BeforeUpdate
} from 'typeorm';
import { DeliveryStatus } from 'src/common/enums/delivery-status.enum';

@Entity('shipping_info')
export class ShippingInfo {
    @PrimaryGeneratedColumn() // serial int
    id: number;

    @Column({ name: 'user_address', type: 'varchar', length: 64 })
    @Index()
    userAddress: string;

    @Column({ name: 'recipient_name', type: 'text' })
    recipientName: string;

    @Column({ name: 'phone_number', type: 'text' })
    phoneNumber: string;

    @Column({ name: 'address', type: 'text' })
    address: string;

    // DB는 varchar(32)로 저장, 앱 레벨에서 enum 사용
    @Column({ name: 'delivery_status', type: 'varchar', length: 32, default: DeliveryStatus.Ready })
    deliveryStatus: DeliveryStatus;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @BeforeInsert()
    @BeforeUpdate()
    normalize() {
        if (this.userAddress) this.userAddress = this.userAddress.toLowerCase();
    }
}