import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from 'src/user/entities/user.entity';

@Entity()
export class LoginHistory {
    @PrimaryGeneratedColumn()
    id: number;

    // 로그인 시점의 지갑 주소를 별도로 기록 (user.walletAddress와 중복되더라도 히스토리 관리용)
    @Column({ length: 66 })
    walletAddress: string;

    @Column({ length: 45 })
    ipAddress: string;

    @Column({ nullable: true })
    userAgent: string;

    @CreateDateColumn()
    loginAt: Date;

    @ManyToOne(() => User, (user) => user.loginHistories, { onDelete: 'CASCADE' })
    user: User;
}

