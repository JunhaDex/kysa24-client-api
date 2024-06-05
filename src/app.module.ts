import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './resources/user/user.module';
import { PostModule } from './resources/post/post.module';
import { GroupModule } from './resources/group/group.module';

@Module({
  imports: [UserModule, PostModule, GroupModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
