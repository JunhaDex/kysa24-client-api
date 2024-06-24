import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Group, GroupUserFollow } from '@/resources/group/group.entity';
import { PageQuery, Paginate } from '@/types/index.type';
import { DEFAULT_PAGE_SIZE } from '@/constants/index.constant';
import { Repository } from 'typeorm';
import { Post } from '@/resources/post/post.entity';

@Injectable()
export class GroupService {
  static GROUP_SERVICE_EXCEPTIONS = {
    GROUP_NOT_FOUND: 'GROUP_NOT_FOUND',
  } as const;

  private readonly Exceptions = GroupService.GROUP_SERVICE_EXCEPTIONS;

  constructor(
    @InjectRepository(Group) private readonly groupRepo: Repository<Group>,
    @InjectRepository(Post) private readonly postRepo: Repository<Post>,
    @InjectRepository(GroupUserFollow)
    private readonly followRepo: Repository<GroupUserFollow>,
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
    let filter = '';
    if (options?.filter?.groupName) {
      filter = `group.name LIKE :name', { name: %${options?.filter?.groupName}% }`;
    }
    // query group table
    const [list, count] = await this.groupRepo
      .createQueryBuilder('group')
      .leftJoinAndSelect('group.creator', 'creator')
      .leftJoinAndSelect(
        (sq) => {
          return sq
            .select('post.*')
            .from('post', 'post')
            .leftJoinAndSelect('post.author', 'author')
            .addSelect('author.nickname', 'authorName')
            .addSelect('author.profileImg', 'authorProfileImg')
            .addSelect('author.geo', 'authorGeo')
            .addSelect('author.teamId', 'authorTeam')
            .orderBy('post.created_at', 'DESC')
            .limit(3);
        },
        'recentPosts',
        'recentPosts.groupId = group.id',
      )
      .addSelect('creator.ref', 'creatorRef')
      .addSelect('creator.nickname', 'creatorName')
      .addSelect('creator.profileImg', 'creatorProfileImg')
      .addSelect('creator.geo', 'creatorGeo')
      .addSelect('creator.teamId', 'creatorTeam')
      .where(filter)
      .orderBy('recentPosts.created_at', 'DESC')
      .skip(skip)
      .take(take)
      .getManyAndCount();
    // return paginated result
    return {
      meta: {
        pageNo: options?.page?.pageNo ?? 1,
        pageSize: size,
        totalPage: Math.ceil(count / size),
        totalCount: count,
      },
      list,
    };
  }

  async listGroupFeeds(
    groupRef: string,
    options?: {
      page: PageQuery;
    },
  ): Promise<Paginate<Post>> {
    const group = await this.groupRepo.findOne({ where: { ref: groupRef } });
    if (group) {
      // setup page queries
      const size = options?.page ? options.page.pageSize : DEFAULT_PAGE_SIZE;
      const skip = options?.page
        ? (options.page.pageNo - 1) * options.page.pageSize
        : 0;
      const take = options?.page ? options.page.pageSize : size;
      // query post table
      const [list, count] = await this.postRepo
        .createQueryBuilder('post')
        .leftJoinAndSelect('post.author', 'author')
        .leftJoinAndSelect('post.group', 'group')
        .addSelect('author.nickname', 'authorName')
        .addSelect('author.profileImg', 'authorProfileImg')
        .addSelect('author.geo', 'authorGeo')
        .addSelect('author.teamId', 'authorTeam')
        .where('group.id = :id', { id: group.id })
        .orderBy('post.created_at', 'DESC')
        .skip(skip)
        .take(take)
        .getManyAndCount();
      return {
        meta: {
          pageNo: options?.page?.pageNo ?? 1,
          pageSize: size,
          totalPage: Math.ceil(count / size),
          totalCount: count,
        },
        list,
      };
    }
    throw new Error(this.Exceptions.GROUP_NOT_FOUND);
  }
}
