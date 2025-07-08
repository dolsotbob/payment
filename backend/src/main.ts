import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import * as crypto from 'crypto';
(global as any).crypto = crypto;

import dotenv from 'dotenv'

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
