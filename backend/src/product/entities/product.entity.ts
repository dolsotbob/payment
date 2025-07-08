// src/product/entities/product.entity.ts

import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Payment } from '../../payment/entities/payment.entity';

@Entity()
export class Product {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string; // ✅ 상품 이름

    @Column({ type: 'numeric' })
    price: string; // (wei 단위 등으로)

    @Column({ nullable: true })
    imageUrl: string;

    @OneToMany(() => Payment, (payment) => payment.product)
    payments: Payment[];
}