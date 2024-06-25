import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Logger } from '@nestjs/common';
import userAgent from 'fastify-user-agent';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
    {
      bodyParser: true,
      cors: {
        origin: '*',
        credentials: true,
      },
    },
  );
  app.register(userAgent);
  app.setGlobalPrefix('api/v1');
  await app.listen(3001);
  Logger.log(`Server running on port 3001`);
  Logger.log(`Timezone: ${process.env.TZ}`);
  Logger.log(`Server Started: ${new Date().toString()}`);
}

bootstrap();
