import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoginHistory } from './entities/login-history.entity';
import { CreateLoginHistoryDto } from './dto/create-login-history.dto';
import { UserService } from 'src/user/user.service';

@Injectable()
export class LoginHistoryService {
    constructor(
        @InjectRepository(LoginHistory)
        private readonly loginHistoryRepo: Repository<LoginHistory>,
        private readonly userService: UserService,
    ) { }

    async create(dto: CreateLoginHistoryDto): Promise<LoginHistory> {
        const user = await this.userService.findOrCreate(dto.walletAddress); // 지갑주소로 유저 조회

        const record = this.loginHistoryRepo.create({
            user, // User 객체를 직접 받아야 함 
            ipAddress: dto.ipAddress,
            userAgent: dto.userAgent,
        })

        return this.loginHistoryRepo.save(record);
    }

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