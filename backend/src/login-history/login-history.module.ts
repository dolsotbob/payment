// login-history.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoginHistory } from './entities/login-history.entity';
import { LoginHistoryService } from './login-history.service';
import { LoginHistoryController } from './login-history.controller';
import { User } from 'src/user/entities/user.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([LoginHistory, User]), //User 레포지토리 주입을 위해 추가
        // UserModule 불필요 (UserService 안 씀). 정말 필요하면 나중에 추가
    ],
    controllers: [LoginHistoryController],
    providers: [LoginHistoryService],
    exports: [LoginHistoryService],
})
export class LoginHistoryModule { }