import './polyfills';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import dotenv from 'dotenv'

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ 글로벌 파이프 설정은 반드시 listen() 전에 위치해야 함
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      enableDebugMessages: true,
    }),
  );

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'https://payment-git-main-dolsotbobs-projects.vercel.app',
      'https://payment-git-feature-payment-expansion-dolsotbobs-projects.vercel.app',
    ],
    credentials: true, // 쿠키 등 자격 정보 포함 여부 (필요 없으면 false)
  });

  // ------ add rounter dump to debug mising API routes ---------
  // const http = app.getHttpAdapter().getInstance();

  // await app.init(); // <<< 중요: 라우트가 다 등록된 후 덤프해야 정확

  // const router = http._router;
  // console.log('--- ROUTES START ---');
  // if (router?.stack) {
  //   router.stack
  //     .filter((layer: any) => layer.route)
  //     .forEach((layer: any) => {
  //       const path = layer.route?.path;
  //       const methods = Object.keys(layer.route.methods)
  //         .filter((m) => layer.route.methods[m])
  //         .map((m) => m.toUpperCase())
  //         .join(',');
  //       console.log(`${methods} ${path}`);
  //     });
  // } else {
  //   console.log('No express router stack found.');
  // }
  // console.log('--- ROUTES END ---');
  // ------------------------------------------------ //

  await app.init();

  const server: any = app.getHttpServer();
  const router = server?._events?.request?._router;
  if (router?.stack) {
    console.log('=== Route map ===');
    router.stack
      .filter((l: any) => l.route)
      .forEach((l: any) => {
        const methods = Object.keys(l.route.methods).join(',').toUpperCase();
        console.log(`${methods} ${l.route.path}`);
      });
  }

  await app.listen(process.env.PORT || 3000);

  // Render는 자체 포트를 process.env.PORT로 전달함; .env의 PORT는 주석처리 되어 있음 
  await app.listen(process.env.PORT ?? 4000);
  console.log(`✅ Server is running on port ${process.env.PORT ?? 4000}`);
}

bootstrap();

// - origin: CORS 요청을 허용할 프론트엔드 도메인 목록. 프론트 주소가 여기에 없으면 브라우저가 차단함.
// -  credentials: true: 브라우저에서 쿠키, Authorization 헤더 등 인증 정보를 포함한 요청을 허용하려면 꼭 설정해야 함. 예: fetch(..., { credentials: 'include' }) 사용 시 필요
// - app.listen(…): 서버를 Render에서 제공한 포트(process.env.PORT)로 시작합니다. 로컬에서는 4000번 사용