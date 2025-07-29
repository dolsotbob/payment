// src/user/user.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserService } from './user.service';

@Module({
    imports: [TypeOrmModule.forFeature([User])], // ✅ 핵심
    providers: [UserService],
    exports: [UserService], // ✅ 다른 모듈에서 사용 가능하게
})
export class UserModule { }