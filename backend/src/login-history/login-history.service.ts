import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoginHistory } from './entities/login-history.entity';
import { CreateLoginHistoryDto } from './dto/create-login-history.dto';
import { User } from 'src/user/entities/user.entity';

@Injectable()
export class LoginHistoryService {
    constructor(
        @InjectRepository(LoginHistory)
        private readonly loginHistoryRepo: Repository<LoginHistory>,
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
    ) { }

    // 1) Auth 성공 시, User 객체와 함께 기록 
    async createWithUser(
        args: { ipAddress: string; userAgent: string },
        user: User,
    ): Promise<LoginHistory> {
        const history = this.loginHistoryRepo.create({
            ipAddress: args.ipAddress,
            userAgent: args.userAgent,
            user,  // ManyToOne(User) 로 매핑되어 있어야 함
            loginAt: new Date(),
        });
        return this.loginHistoryRepo.save(history);
    }

    // 2) authUser.id로 유저를 찾아 기록 
    async writeLogin(
        dto: CreateLoginHistoryDto,
        authUser: { id: string },
    ): Promise<LoginHistory> {
        // a) 유저 찾기 (id 기반)
        const user = await this.userRepo.findOne({ where: { id: authUser.id } });
        if (!user) throw new NotFoundException('User not found');

        // b) 단일 객체로 create (배열 x)
        const record = this.loginHistoryRepo.create({
            user,  // 관계로 연결 
            ipAddress: dto.ipAddress,
            userAgent: dto.userAgent,
            loginAt: new Date(),
        })

        // c) save는 단일 엔티티 
        return this.loginHistoryRepo.save(record);
    }

    // 3) 지갑 주소로 로그인 기록을 조회; 최신 기록이 먼저 나오도록 정렬  
    async findByWalletAddress(walletAddress: string): Promise<LoginHistory[]> {
        return this.loginHistoryRepo.find({
            where: {
                user: {
                    walletAddress: walletAddress.toLowerCase(),
                },
            },
            relations: ['user'],
            order: {
                loginAt: 'DESC',
            },
        });
    }
}