import { Global, Module } from '@nestjs/common';
import { PostService } from './post.service';
import { PostController } from './post.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post, PostComment, PostLike } from '@/resources/post/post.entity';
import { Group } from '@/resources/group/group.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Post, PostComment, PostLike, Group])],
  controllers: [PostController],
  providers: [PostService],
  exports: [PostService],
})
export class PostModule {}
