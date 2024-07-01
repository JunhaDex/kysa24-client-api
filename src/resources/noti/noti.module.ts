import { Global, Module } from '@nestjs/common';
import { NotiService } from './noti.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from '@/resources/noti/noti.entity';
import { UserDevice } from '@/resources/user/user.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Notification, UserDevice])],
  controllers: [],
  providers: [NotiService],
  exports: [NotiService],
})
export class NotiModule {}
