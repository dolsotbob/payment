import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoginHistory } from './entities/login-history.entity';
import { LoginHistoryService } from './login-history.service';
import { LoginHistoryController } from './login-history.controller';
import { UserModule } from 'src/user/user.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([LoginHistory]),
        UserModule,
    ],
    controllers: [LoginHistoryController],
    providers: [LoginHistoryService],
    exports: [LoginHistoryService],
})
export class LoginHistoryModule { }
