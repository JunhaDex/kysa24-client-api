import { v4 as uuidv4 } from 'uuid';
import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Group, GroupUserFollow } from '@/resources/group/group.entity';
import { PageQuery, Paginate } from '@/types/index.type';
import { DEFAULT_PAGE_SIZE } from '@/constants/index.constant';
import { DataSource, In, Like, Repository } from 'typeorm';
import { Post } from '@/resources/post/post.entity';
import { GroupCreateDto, GroupUpdateDto } from '@/resources/group/group.type';
import { flattenObject } from '@/utils/index.util';
import { PostService } from '@/resources/post/post.service';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Redis } from 'ioredis';

@Injectable()
export class GroupService implements OnApplicationBootstrap {
  static GROUP_SERVICE_EXCEPTIONS = {
    GROUP_NOT_FOUND: 'GROUP_NOT_FOUND',
    GROUP_EXISTS: 'GROUP_EXISTS',
    GROUP_UNAUTHORIZED: 'GROUP_UNAUTHORIZED',
  } as const;

  private readonly Exceptions = GroupService.GROUP_SERVICE_EXCEPTIONS;
  private readonly redisClient: Redis;

  constructor(
    @InjectRepository(Group) private readonly groupRepo: Repository<Group>,
    @InjectRepository(Post) private readonly postRepo: Repository<Post>,
    @InjectRepository(GroupUserFollow)
    private readonly followRepo: Repository<GroupUserFollow>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly postService: PostService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {
    this.redisClient = (this.cacheManager as any).store.getClient();
  }

  async onApplicationBootstrap(): Promise<void> {
    Logger.log('Caching Groups...');
    const rawQuery = `
        SELECT g.id         AS id,
               g.group_name AS group_name,
               p.id         AS post_id,
               p.created_at AS post_created_at
        FROM \`group\` g
                 LEFT OUTER JOIN (SELECT post.*
                                  FROM post
                                  WHERE (post.group_id, post.created_at) IN (SELECT group_id, MAX(created_at)
                                                                             FROM post
                                                                             GROUP BY group_id)) p ON g.id = p.group_id
        ORDER BY p.created_at DESC, g.id ASC;
    `;
    const groupIds = await this.groupRepo.query(rawQuery);
    await this.redisClient.del('group:list');
    for (const group of groupIds) {
      await this.redisClient.rpush('group:list', group.id);
    }
  }

  async updateGroupPriority(): Promise<void> {
    const preConfigured = [1];
    const cached = await this.redisClient.lrange('group:list', 0, -1);
    const groups = await this.groupRepo.find();
    const changed: Group[] = [];
    const priority = [
      ...preConfigured,
      ...cached
        .map((id) => parseInt(id))
        .filter((id) => !preConfigured.includes(id)),
    ];
    let pp = 1;
    for (const id of priority) {
      const group = groups.find((g) => g.id === id);
      if (group) {
        if (group.priority !== pp) {
          group.priority = pp;
          changed.push(group);
        }
        pp += 1;
      }
    }
    if (changed.length > 0) {
      await this.groupRepo.save(changed);
    }
  }

  async listGroups(options?: {
    page?: PageQuery;
    filter?: { groupName: string };
    sender?: number;
  }): Promise<Paginate<Group>> {
    // setup page queries
    const size = options?.page ? options.page.pageSize : DEFAULT_PAGE_SIZE;
    const skip = options?.page
      ? (options.page.pageNo - 1) * options.page.pageSize
      : 0;
    const take = options?.page ? options.page.pageSize : size;
    // setup filter queries
    let filter: any = {
      isShow: 1,
    };
    if (options?.filter?.groupName) {
      filter = { ...filter, groupName: Like(`%${options.filter.groupName}%`) };
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
        followers: {
          id: true,
        },
      },
      where: filter,
      skip,
      take,
      order: {
        priority: 'ASC',
      },
      relations: ['creatorUser', 'followers'],
    });
    let posts = [];
    if (groups.length > 0) {
      posts = await this.groupRepo
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
        .where('group.id IN (:...ids)', {
          ids: groups.map((group) => group.id),
        })
        .getRawMany();
    }
    // personalization
    let following = undefined;
    if (options?.sender) {
      following = await this.getFollowingGroups(
        options.sender,
        groups.map((group) => group.id),
      );
    }
    // return paginated result
    return {
      meta: {
        pageNo: options?.page?.pageNo ?? 1,
        pageSize: size,
        totalPage: Math.ceil(count / size),
        totalCount: count,
      },
      list: this.addGroupPosts(groups, posts, { following }),
    };
  }

  async listMyGroups(me: number): Promise<Group[]> {
    const follows = await this.followRepo.find({
      where: { follower: me },
      relations: ['group'],
      order: {
        group: {
          priority: 'ASC',
        },
      },
      take: 5,
    });
    return follows.map((follow) => follow.group);
  }

  private addGroupPosts(
    groups: Group[],
    posts: any,
    options?: { following: number[] },
  ): Group[] {
    const flattened = groups.map((group) => {
      const flatten = flattenObject(group, {
        alias: {
          'creatorUser.ref': 'creatorRef',
          'creatorUser.nickname': 'creatorNickname',
        },
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
      if (options?.following) {
        group.already = options.following.includes(group.id);
      }
      return group;
    });
  }

  async getGroupByRef(
    groupRef: string,
    options?: { sender?: number },
  ): Promise<Group> {
    // query group table
    const group = await this.groupRepo.findOne({
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
      where: { ref: groupRef },
      relations: ['creatorUser', 'posts', 'followers'],
    });
    if (group) {
      const clean = flattenObject(group, {
        alias: {
          'creatorUser.ref': 'creatorRef',
          'creatorUser.nickname': 'creatorNickname',
        },
      }) as any;
      if (options?.sender) {
        const follows = await this.getFollowingGroups(options.sender, [
          group.id,
        ]);
        clean.already = follows.includes(group.id);
      }
      // personalization
      let following: any;
      if (options?.sender) {
        following = await this.getFollowingGroups(options.sender, [group.id]);
        clean.following = following.includes(group.id);
      }
      // return group instance
      return {
        ...clean,
        followers: group.followers.length,
      } as Group;
    }
    throw new Error(this.Exceptions.GROUP_NOT_FOUND);
  }

  /**
   * returns group ids intersected with following groups
   * @param userId
   * @param groupIds
   * @private
   */
  private async getFollowingGroups(userId: number, groupIds: number[]) {
    const follows = await this.followRepo.find({
      where: { follower: userId, groupId: In(groupIds) },
    });
    return follows.map((follow) => follow.groupId);
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
      newGroup.profileImg = group.profileImg;
      newGroup.creator = group.creator;
      newGroup.priority = 2;
      const result = await this.groupRepo.save(newGroup);
      await this.followGroup(newGroup.ref, group.creator, { isMust: true });
      await this.redisClient.lpush('group:list', result.id);
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
      const follow = await this.followRepo.findOneBy({
        groupId: group.id,
        follower,
      });
      if (!follow) {
        const newFollow = this.followRepo.create({
          groupId: group.id,
          follower,
          isMust: options?.isMust ?? false,
          role: options?.role ?? 'writer',
        });
        await this.followRepo.save(newFollow);
      }
      return;
    }
    throw new Error(this.Exceptions.GROUP_NOT_FOUND);
  }

  async unfollowGroup(groupRef: string, follower: number): Promise<void> {
    const group = await this.groupRepo.findOneBy({ ref: groupRef });
    if (group) {
      const follow = await this.followRepo.findOneBy({
        groupId: group.id,
        follower,
      });
      if (follow) {
        if (!follow.isMust) {
          await this.followRepo.delete(follow.id);
          return;
        }
        throw new Error(this.Exceptions.GROUP_UNAUTHORIZED);
      }
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
