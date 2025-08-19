import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('cashbacks')
export class Cashback {
    @PrimaryGeneratedColumn('uuid') id!: string;

    @Index()
    @Column({ length: 64 }) wallet!: string;

    @Column({ type: 'numeric', precision: 78, scale: 0 }) amountWei!: string;

    @Column({ type: 'varchar', length: 16, default: 'PENDING' }) status!: 'PENDING' | 'SENT' | 'FAILED';

    @Column({ length: 100, nullable: true }) txHash?: string | null;

    @CreateDateColumn() createdAt!: Date;
}