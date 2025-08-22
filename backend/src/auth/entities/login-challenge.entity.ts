// src/auth/entities/login-challenge.entity.ts
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('login_challenges')
@Index(['address', 'nonce'], { unique: true })
export class LoginChallenge {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 42 })
    address!: string; // 소문자

    @Column({ type: 'varchar', length: 64 })
    nonce!: string;

    @Column({ type: 'timestamptz' })
    expiresAt!: Date;

    @Column({ type: 'boolean', default: false })
    used!: boolean;

    @CreateDateColumn()
    createdAt!: Date;
}