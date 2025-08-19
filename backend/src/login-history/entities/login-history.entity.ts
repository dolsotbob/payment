import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, Index } from 'typeorm';
import { User } from 'src/user/entities/user.entity';

@Entity('user_login_history')
export class LoginHistory {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ length: 45 })
    ipAddress: string;

    @Column({ nullable: true })
    userAgent: string;

    @CreateDateColumn()
    loginAt: Date;

    @ManyToOne(() => User, (user) => user.loginHistories, { onDelete: 'CASCADE' })
    user: User;
}

