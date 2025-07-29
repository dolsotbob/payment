import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UserService {
    constructor(
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
    ) { }

    // 지갑 주소로 사용자 조회 
    async findByWalletAddress(address: string): Promise<User | null> {
        return this.userRepo.findOneBy({ walletAddress: address.toLowerCase() });
    }

    // 필요 시 새 유저 생성 
    async createUser(address: string): Promise<User> {
        const newUser = this.userRepo.create({ walletAddress: address.toLowerCase() });
        return this.userRepo.save(newUser);
    }

    // 로그인 흐름에서: 있으면 반환, 없으면 생성
    async findOrCreate(address: string): Promise<User> {
        const existing = await this.findByWalletAddress(address);
        return existing ?? this.createUser(address);
    }
}