import './polyfills';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import dotenv from 'dotenv'

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'https://payment-git-main-dolsotbobs-projects.vercel.app',
      'https://payment-git-feature-payment-expansion-dolsotbobs-projects.vercel.app/'
    ],
    credentials: true, // 쿠키 등 자격 정보 포함 여부 (필요 없으면 false)
  });
  // Render는 자체 포트를 process.env.PORT로 전달함; .env의 PORT는 주석처리 되어 있음 
  await app.listen(process.env.PORT ?? 4000);
  console.log(`✅ Server is running on port ${process.env.PORT ?? 4000}`);
}
bootstrap();

// - origin: CORS 요청을 허용할 프론트엔드 도메인 목록. 프론트 주소가 여기에 없으면 브라우저가 차단함.
// -  credentials: true: 브라우저에서 쿠키, Authorization 헤더 등 인증 정보를 포함한 요청을 허용하려면 꼭 설정해야 함. 예: fetch(..., { credentials: 'include' }) 사용 시 필요
// - app.listen(…): 서버를 Render에서 제공한 포트(process.env.PORT)로 시작합니다. 로컬에서는 4000번 사용