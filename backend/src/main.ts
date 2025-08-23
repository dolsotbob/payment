import './polyfills';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';

// 개발 환경에서만 .env 로드
if (process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('dotenv').config();
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.PORT ?? 4000);

  // 개발/운영 별 ValidationPipe 설정
  const isProd = process.env.NODE_ENV === 'production';
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      enableDebugMessages: !isProd,
    }),
  );

  app.enableCors({
    origin: (origin, cb) => {
      // 서버-서버 호출 또는 Postman 등 Origin 없는 경우 허용
      if (!origin) return cb(null, true);

      // CORS: 화이트리스트 + *.vercel.app 프리뷰 허용
      const allowList = new Set<string>([
        'http://localhost:3000',
        'https://payment-git-main-dolsotbobs-projects.vercel.app',
        'https://payment-git-feature-payment-expansion-dolsotbobs-projects.vercel.app',
        'https://payment-git-feature-payment-expansion-dolsotbobs-projects.vercel.app',
        'https://payment-git-feature-payment-coupon-rule-dolsotbobs-projects.vercel.app',
      ]);

      const isAllowed =
        allowList.has(origin) || /\.vercel\.app$/i.test(origin);
      return isAllowed
        ? cb(null, true)
        : cb(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,  // 쿠키/Authorization 등 인증 정보 포함 허용 
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    // 응답 헤더를 프론트에서 읽어야 하면 추가 (필요 없으면 생략 가능)
    // exposedHeaders: ['Content-Length','Content-Type'],
    optionsSuccessStatus: 204,
  });

  // 그레이스풀 셧다운
  app.enableShutdownHooks();

  // 라우트 맵 디버깅 (옵션)
  if (process.env.DEBUG_ROUTES === '1') {
    // listen 전에 init하여 라우트가 모두 등록된 상태로 확인
    await app.init();

    const server: any = app.getHttpServer();
    const router = server?._events?.request?._router;

    if (router?.stack) {
      Logger.log('=== Route map ===', 'Bootstrap');
      router.stack
        .filter((l: any) => l.route)
        .forEach((l: any) => {
          const methods = Object.keys(l.route.methods).join(',').toUpperCase();
          Logger.log(`${methods} ${l.route.path}`, 'Router');
        });
    } else {
      Logger.warn('No express router stack found.', 'Router');
    }
  }

  // Render는 PORT 환경변수를 주입함 — 0.0.0.0 바인딩
  await app.listen(port, '0.0.0.0');
  Logger.log(`✅ Server is running on http://0.0.0.0:${port}`, 'Bootstrap');
}

bootstrap();

// - origin: CORS 요청을 허용할 프론트엔드 도메인 목록. 프론트 주소가 여기에 없으면 브라우저가 차단함.
// -  credentials: true: 브라우저에서 쿠키, Authorization 헤더 등 인증 정보를 포함한 요청을 허용하려면 꼭 설정해야 함. 예: fetch(..., { credentials: 'include' }) 사용 시 필요
// - app.listen(…): 서버를 Render에서 제공한 포트(process.env.PORT)로 시작합니다. 로컬에서는 4000번 사용