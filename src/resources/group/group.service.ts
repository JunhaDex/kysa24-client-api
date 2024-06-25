import { v4 as uuidv4 } from 'uuid';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Group, GroupUserFollow } from '@/resources/group/group.entity';
import { PageQuery, Paginate } from '@/types/index.type';
import { DEFAULT_PAGE_SIZE } from '@/constants/index.constant';
import { Repository } from 'typeorm';
import { Post } from '@/resources/post/post.entity';
import { GroupCreateDto, GroupUpdateDto } from '@/resources/group/group.type';

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

  async followGroup(groupRef: string, follower: number): Promise<void> {
    const group = await this.groupRepo.findOneBy({ ref: groupRef });
    if (group) {
      const follow = this.followRepo.create({
        groupId: group.id,
        follower,
        isMust: false,
        role: 'writer',
      });
      await this.followRepo.save(follow);
      return;
    }
    throw new Error(this.Exceptions.GROUP_NOT_FOUND);
  }
}
