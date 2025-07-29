import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { LoginHistory } from 'src/login-history/entities/login-history.entity';

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    walletAddress: string;

    @OneToMany(() => LoginHistory, (login) => login.user)
    loginHistories: LoginHistory[];
}