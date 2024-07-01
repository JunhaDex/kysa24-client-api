import { Global, Module } from '@nestjs/common';
import { PostService } from './post.service';
import { PostController } from './post.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post, PostComment, PostLike } from '@/resources/post/post.entity';
import { Group, GroupUserFollow } from '@/resources/group/group.entity';
import { NotiService } from '@/resources/noti/noti.service';
import { User, UserDevice } from '@/resources/user/user.entity';
import { Notification } from '@/resources/noti/noti.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Post,
      PostComment,
      PostLike,
      Group,
      GroupUserFollow,
      User,
      Notification,
      UserDevice,
    ]),
  ],
  controllers: [PostController],
  providers: [PostService, NotiService],
  exports: [PostService],
})
export class PostModule {}
