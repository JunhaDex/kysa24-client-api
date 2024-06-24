import { Module } from '@nestjs/common';
import { PostService } from './post.service';
import { PostController } from './post.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post, PostComment, PostLike } from '@/resources/post/post.entity';
import { Group } from '@/resources/group/group.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Post, PostComment, PostLike, Group])],
  controllers: [PostController],
  providers: [PostService],
})
export class PostModule {}
