// src/product/entities/product.entity.ts

import { Entity, Column, PrimaryGeneratedColumn, OneToMany, CreateDateColumn } from 'typeorm';
import { Payment } from '../../payment/entities/payment.entity';

@Entity('products')
export class Product {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 64, nullable: true })
    sku?: string;

    @Column({ type: 'text' })
    name: string; // 상품 이름

    // numeric(78,0) ← uint256 대응. TS에서는 string으로 다루기
    @Column({
        name: 'price_wei',
        type: 'numeric',
        precision: 78,
        scale: 0,
    })
    priceWei: string;

    @Column({ name: 'image_url', type: 'text', nullable: true })
    imageUrl?: string;

    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @Column({ name: 'hover_image_url', type: 'text', nullable: true })
    hoverImageUrl?: string;

    @OneToMany(() => Payment, (payment) => payment.product)
    payments: Payment[];
}
