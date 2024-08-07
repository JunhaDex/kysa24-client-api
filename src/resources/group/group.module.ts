import { Global, Module } from '@nestjs/common';
import { GroupService } from './group.service';
import { GroupController } from './group.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Group, GroupUserFollow } from '@/resources/group/group.entity';
import { Post } from '@/resources/post/post.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Group, Post, GroupUserFollow])],
  controllers: [GroupController],
  providers: [GroupService],
  exports: [GroupService],
})
export class GroupModule {}
