import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-ioredis';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from '@/resources/user/user.module';
import { PostModule } from '@/resources/post/post.module';
import { GroupModule } from '@/resources/group/group.module';
import { REDIS_CONFIG } from '@/providers/redis.provider';
import { MYSQL_CONFIG } from '@/providers/mysql.provider';
import { ChatModule } from '@/resources/chat/chat.module';
import { UploadModule } from '@/resources/upload/upload.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...MYSQL_CONFIG,
      entities: ['dist/**/*.entity{.ts,.js}'],
      synchronize: false,
      // logging: true,
    }),
    CacheModule.register({
      ...REDIS_CONFIG,
      isGlobal: true,
      store: redisStore,
    }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_HASH,
      signOptions: { expiresIn: '2h' },
    }),
    UserModule,
    PostModule,
    GroupModule,
    ChatModule,
    UploadModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
