import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
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
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { AuthMiddleware } from '@/middlewares/auth.middleware';
import { NotiModule } from '@/resources/noti/noti.module';
import { UploadMiddleware } from '@/middlewares/upload.middleware';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...MYSQL_CONFIG,
      entities: ['dist/**/*.entity{.ts,.js}'],
      synchronize: false,
      namingStrategy: new SnakeNamingStrategy(),
      logging: true,
    }),
    CacheModule.register({
      ...REDIS_CONFIG,
      isGlobal: true,
      store: redisStore,
    }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET_HASH,
      signOptions: { expiresIn: '2h' },
    }),
    UserModule,
    PostModule,
    GroupModule,
    ChatModule,
    UploadModule,
    NotiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .exclude(
        { path: 'auth/login', method: RequestMethod.POST },
        { path: 'group', method: RequestMethod.GET },
        { path: 'post/feed/:gRef', method: RequestMethod.GET },
        { path: 'post/detail/:id', method: RequestMethod.GET },
        { path: 'post/:id/reply', method: RequestMethod.GET },
        { path: 'healthz', method: RequestMethod.GET },
        { path: '*', method: RequestMethod.OPTIONS },
      )
      .forRoutes(
        { path: '*', method: RequestMethod.GET },
        { path: '*', method: RequestMethod.POST },
        { path: '*', method: RequestMethod.PUT },
        { path: '*', method: RequestMethod.DELETE },
      );
    consumer.apply(AuthMiddleware, UploadMiddleware).forRoutes({
      path: 'upload/*',
      method: RequestMethod.POST,
    });
  }
}
