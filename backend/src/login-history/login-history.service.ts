import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoginHistory } from './entities/login-history.entity';
import { CreateLoginHistoryDto } from './dto/create-login-history.dto';
import { User } from 'src/user/entities/user.entity';

@Injectable()
export class LoginHistoryService {
    createWithUser(arg0: { walletAddress: string; ipAddress: any; userAgent: string; }, user: User) {
        throw new Error('Method not implemented.');
    }
    constructor(
        @InjectRepository(LoginHistory)
        private readonly loginHistoryRepo: Repository<LoginHistory>,
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
    ) { }

    async writeLogin(
        dto: CreateLoginHistoryDto,
        authUser: { id: string },
    ) {
        // 1) 유저 찾기 (id 기반)
        const user = await this.userRepo.findOne({ where: { id: authUser.id } });
        if (!user) throw new NotFoundException('User not found');

        // 2) 단일 객체로 create (배열 x)
        const record = this.loginHistoryRepo.create({
            user,  // 관계로 연결 
            ipAddress: dto.ipAddress,
            userAgent: dto.userAgent,
            loginAt: new Date(),
        })

        // 3) save는 단일 엔티티 
        return this.loginHistoryRepo.save(record);
    }

    // 지갑 주소로 로그인 기록을 조회; 최신 기록이 먼저 나오도록 정렬  
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