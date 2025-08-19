import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, Index, JoinColumn } from 'typeorm';
import { User } from 'src/user/entities/user.entity';

@Entity('user_login_history')
export class LoginHistory {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'ip', type: 'varchar', length: 64 })
    ipAddress: string;

    @Column({ name: 'user_agent', type: 'text', nullable: true })
    userAgent: string;

    @CreateDateColumn({ name: 'logged_at' })
    loginAt: Date;

    @Index()
    @ManyToOne(() => User, (user) => user.loginHistories, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' }) // 👈 FK 컬럼명을 DB와 동일하게
    user: User;
}

