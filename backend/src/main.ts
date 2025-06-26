import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import * as crypto from 'crypto';
(global as any).crypto = crypto;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
