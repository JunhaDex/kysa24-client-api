import { v4 as uuidv4 } from 'uuid';
import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Group, GroupUserFollow } from '@/resources/group/group.entity';
import { PageQuery, Paginate } from '@/types/index.type';
import { DEFAULT_PAGE_SIZE } from '@/constants/index.constant';
import { DataSource, Like, Repository } from 'typeorm';
import { Post } from '@/resources/post/post.entity';
import { GroupCreateDto, GroupUpdateDto } from '@/resources/group/group.type';
import { flattenObject } from '@/utils/index.util';
import { PostService } from '@/resources/post/post.service';

@Injectable()
export class GroupService {
  static GROUP_SERVICE_EXCEPTIONS = {
    GROUP_NOT_FOUND: 'GROUP_NOT_FOUND',
    GROUP_EXISTS: 'GROUP_EXISTS',
    GROUP_UNAUTHORIZED: 'GROUP_UNAUTHORIZED',
  } as const;

  private readonly Exceptions = GroupService.GROUP_SERVICE_EXCEPTIONS;

  constructor(
    @InjectRepository(Group) private readonly groupRepo: Repository<Group>,
    @InjectRepository(Post) private readonly postRepo: Repository<Post>,
    @InjectRepository(GroupUserFollow)
    private readonly followRepo: Repository<GroupUserFollow>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly postService: PostService,
  ) {}

  async listGroups(options?: {
    page: PageQuery;
    filter: { groupName: string };
  }): Promise<Paginate<Group>> {
    // setup page queries
    const size = options?.page ? options.page.pageSize : DEFAULT_PAGE_SIZE;
    const skip = options?.page
      ? (options.page.pageNo - 1) * options.page.pageSize
      : 0;
    const take = options?.page ? options.page.pageSize : size;
    // setup filter queries
    let filter: any;
    if (options?.filter?.groupName) {
      filter = { groupName: Like(`%${options.filter.groupName}%`) };
    }
    // query group table
    const [groups, count] = await this.groupRepo.findAndCount({
      select: {
        id: true,
        ref: true,
        creator: true,
        groupName: true,
        profileImg: true,
        coverImg: true,
        introduce: true,
        isShow: true,
        priority: true,
        creatorUser: {
          ref: true,
          nickname: true,
        },
        posts: {
          createdAt: true,
        },
        followers: {
          id: true,
        },
      },
      where: filter,
      skip,
      take,
      order: {
        priority: 'DESC',
        posts: {
          createdAt: 'DESC',
        },
      },
      relations: ['creatorUser', 'posts', 'followers'],
    });
    const posts = await this.groupRepo
      .createQueryBuilder('group')
      .select('group.id AS id')
      .leftJoinAndMapMany(
        'group.posts',
        (sq) => {
          return sq
            .select([
              'post.id AS post_id',
              'post.message AS post_message',
              'post.created_at AS post_created_at',
              'group_id',
            ])
            .from(Post, 'post')
            .leftJoin('post.authorUser', 'authorUser')
            .addSelect([
              'authorUser.nickname AS author_nickname',
              'authorUser.ref AS author_ref',
              'authorUser.team_id AS author_team_id',
              'authorUser.profile_img AS author_profile_img',
            ])
            .orderBy('post.created_at', 'DESC')
            .limit(3);
        },
        'posts',
        'posts.group_id = group.id',
      )
      .where('group.id IN (:...ids)', { ids: groups.map((group) => group.id) })
      .getRawMany();
    // return paginated result
    return {
      meta: {
        pageNo: options?.page?.pageNo ?? 1,
        pageSize: size,
        totalPage: Math.ceil(count / size),
        totalCount: count,
      },
      list: this.addGroupPosts(groups, posts),
    };
  }

  private addGroupPosts(groups: Group[], posts: any): Group[] {
    const flattened = groups.map((group) => {
      const flatten = flattenObject(group, {
        exclude: ['creatorUser.ref', 'creatorUser.nickname'],
      }) as any;
      return {
        ...flatten,
        followers: group.followers.length,
      };
    });
    return flattened.map((group) => {
      group.posts = posts
        .filter((post: any) => post.group_id === group.id)
        .map((item: any) => {
          return flattenObject(item, {
            alias: {
              post_id: 'id',
              post_message: 'message',
              post_created_at: 'createdAt',
              author_nickname: 'authorNickname',
              author_ref: 'authorRef',
              author_team_id: 'authorTeamId',
              author_profile_img: 'authorProfileImg',
            },
          }) as any;
        });
      return group;
    });
  }

  async createGroup(group: GroupCreateDto): Promise<void> {
    const exist = await this.groupRepo.findOneBy({
      groupName: group.groupName,
    });
    if (!exist) {
      const newGroup = this.groupRepo.create();
      newGroup.ref = uuidv4();
      newGroup.isShow = true;
      newGroup.groupName = group.groupName;
      newGroup.introduce = group.introduce;
      newGroup.coverImg = group.coverImg;
      newGroup.creator = group.creator;
      await this.groupRepo.save(newGroup);
      await this.followGroup(newGroup.ref, group.creator, { isMust: true });
      return;
    }
    throw new Error(this.Exceptions.GROUP_EXISTS);
  }

  async updateGroup(
    creator: number,
    groupRef: string,
    groupUpdate: GroupUpdateDto,
  ): Promise<void> {
    const group = await this.groupRepo.findOneBy({ ref: groupRef });
    if (group) {
      if (creator === group.creator) {
        group.introduce = groupUpdate.introduce;
        group.profileImg = groupUpdate.profileImg;
        group.coverImg = groupUpdate.coverImg;
        await this.groupRepo.save(group);
        return;
      }
      throw new Error(this.Exceptions.GROUP_UNAUTHORIZED);
    }
    throw new Error(this.Exceptions.GROUP_NOT_FOUND);
  }

  async followGroup(
    groupRef: string,
    follower: number,
    options?: {
      isMust?: boolean;
      role?: 'reader' | 'writer';
    },
  ): Promise<void> {
    const group = await this.groupRepo.findOneBy({ ref: groupRef });
    if (group) {
      const follow = this.followRepo.create({
        groupId: group.id,
        follower,
        isMust: options?.isMust ?? false,
        role: options?.role ?? 'writer',
      });
      await this.followRepo.save(follow);
      return;
    }
    throw new Error(this.Exceptions.GROUP_NOT_FOUND);
  }

  async deleteGroup(creator: number, groupRef: string): Promise<void> {
    const group = await this.groupRepo.findOneBy({ ref: groupRef });
    if (group) {
      if (creator === group.creator) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
          const posts = await this.postRepo.findBy({ groupId: group.id });
          await this.postService.deletePostWithInjection(
            queryRunner,
            posts.map((post) => post.id as number),
          );
          await queryRunner.manager.delete(GroupUserFollow, {
            groupId: group.id,
          });
          await queryRunner.manager.delete(Group, { id: group.id });
          await queryRunner.commitTransaction();
        } catch (err) {
          await queryRunner.rollbackTransaction();
          throw err;
        } finally {
          await queryRunner.release();
        }
        return;
      }
      throw new Error(this.Exceptions.GROUP_UNAUTHORIZED);
    }
    throw new Error(this.Exceptions.GROUP_NOT_FOUND);
  }
}
