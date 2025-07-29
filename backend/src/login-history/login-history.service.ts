import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoginHistory } from './entities/login-history.entity';

@Injectable()
export class LoginHistoryService {
    constructor(
        @InjectRepository(LoginHistory)
        private readonly loginHistoryRepo: Repository<LoginHistory>,
    ) { }

    // 지갑 주소로 로그인 기록을 조회; 최신 기록이 먼저 나오도록 정렬  
    async findByWalletAddress(walletAddress: string): Promise<LoginHistory[]> {
        return this.loginHistoryRepo.find({
            where: {
                user: {
                    walletAddress,
                },
            },
            relations: ['user'],
            order: {
                loginAt: 'DESC',
            },
        });
    }
}