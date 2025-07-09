import './polyfills';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import dotenv from 'dotenv'

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: 'https://payment-git-main-dolsotbobs-projects.vercel.app/',
    credentials: true, // 쿠키 등 자격 정보 포함 여부 (필요 없으면 false)
  });
  // Render는 자체 포트를 process.env.PORT로 전달함; .env의 PORT는 주석처리 되어 있음 
  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
