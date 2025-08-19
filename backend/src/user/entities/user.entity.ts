// src/user/entities/user.entity.ts
import {
    Entity, Column, PrimaryGeneratedColumn, OneToMany,
    CreateDateColumn, BeforeInsert, BeforeUpdate,
} from 'typeorm';
import { LoginHistory } from 'src/login-history/entities/login-history.entity';

@Entity('users') // ← 테이블명 명시
export class User {
    @PrimaryGeneratedColumn('uuid') // ← uuid PK
    id: string;

    @Column({ type: 'varchar', length: 64, nullable: true })
    uid?: string; // 선택

    @Column({ name: 'wallet_address', type: 'varchar', length: 64, unique: true })
    walletAddress: string;

    @Column({ type: 'text', nullable: true })
    email?: string;

    @Column({ type: 'text', nullable: true })
    phone?: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @OneToMany(() => LoginHistory, (loginHistory) => loginHistory.user)
    loginHistories: LoginHistory[];

    @BeforeInsert()
    @BeforeUpdate()
    normalizeWallet() {
        if (this.walletAddress) this.walletAddress = this.walletAddress.toLowerCase();
    }
}