import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from 'src/user/entities/user.entity';

@Entity()
export class LoginHistory {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, (user) => user.loginHistories, { onDelete: 'CASCADE' })
    user: User;

    @Column({ length: 45 })
    ipAddress: string;

    @Column({ nullable: true })
    userAgent: string;

    @CreateDateColumn()
    loginAt: Date;

}