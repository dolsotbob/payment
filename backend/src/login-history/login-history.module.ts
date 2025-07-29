import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoginHistory } from './entities/login-history.entity';
import { LoginHistoryService } from './login-history.service';
import { LoginHistoryController } from './login-history.controller';

@Module({
    imports: [TypeOrmModule.forFeature([LoginHistory])],
    controllers: [LoginHistoryController],
    providers: [LoginHistoryService],
    exports: [LoginHistory],
})
export class LoginHistoryModule { }
