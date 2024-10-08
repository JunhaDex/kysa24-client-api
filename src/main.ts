import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Logger } from '@nestjs/common';
import multipart from '@fastify/multipart';
import userAgent from 'fastify-user-agent';

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

async function bootstrap() {
  dayjs.extend(utc);
  dayjs.extend(timezone);
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false, bodyLimit: 10 * 1024 * 1024 }),
    {
      bodyParser: true,
      cors: {
        origin: '*',
        credentials: true,
      },
    },
  );
  await app.register(userAgent);
  await app.register(multipart);
  app.setGlobalPrefix('api/v1');
  await app.listen(3001, '0.0.0.0');
  Logger.log(`Server running on port 3001`);
  Logger.log(`Timezone: ${process.env.TZ}`);
  Logger.log(`Server Started: ${new Date().toString()}`);
}

bootstrap();
