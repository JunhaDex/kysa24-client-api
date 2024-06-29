import { Global, Module } from '@nestjs/common';
import { NotiService } from './noti.service';

@Global()
@Module({
  controllers: [],
  providers: [NotiService],
  exports: [NotiService],
})
export class NotiModule {}
