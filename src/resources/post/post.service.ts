import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, QueryRunner, Repository } from 'typeorm';
import { Post, PostComment, PostLike } from '@/resources/post/post.entity';
import { PageQuery, Paginate } from '@/types/index.type';
import { Group } from '@/resources/group/group.entity';
import { DEFAULT_PAGE_SIZE } from '@/constants/index.constant';
import {
  PostCommentCreateDto,
  PostCreateDto,
  PostUpdateDto,
} from '@/resources/post/post.type';
import { flattenObject } from '@/utils/index.util';

@Injectable()
export class PostService {
  static POST_SERVICE_EXCEPTIONS = {
    GROUP_NOT_FOUND: 'GROUP_NOT_FOUND',
    POST_NOT_FOUND: 'POST_NOT_FOUND',
    NOT_AUTHOR: 'NOT_AN_AUTHOR',
  } as const;
  private readonly Exceptions = PostService.POST_SERVICE_EXCEPTIONS;

  constructor(
    @InjectRepository(Post) private postRepo: Repository<Post>,
    @InjectRepository(PostComment) private commentRepo: Repository<PostComment>,
    @InjectRepository(PostLike) private likeRepo: Repository<PostLike>,
    @InjectRepository(Group) private groupRepo: Repository<Group>,
    @InjectDataSource() private dataSource: DataSource,
  ) {}

  async listPosts(
    groupRef: string,
    options?: { page: PageQuery },
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
      const [list, count] = await this.postRepo.findAndCount({
        select: {
          id: true,
          author: true,
          image: true,
          message: true,
          createdAt: true,
          authorUser: {
            ref: true,
            nickname: true,
            profileImg: true,
            coverImg: true,
            introduce: true,
            teamId: true,
          },
          likes: {
            id: true,
          },
          comments: {
            id: true,
          },
        },
        where: { groupId: group.id },
        order: { createdAt: 'DESC' },
        skip,
        take,
        relations: ['authorUser', 'likes', 'comments'],
      });
      return {
        meta: {
          pageNo: options?.page?.pageNo ?? 1,
          pageSize: size,
          totalPage: Math.ceil(count / size),
          totalCount: count,
        },
        list: this.cleanupListItem(list),
      };
    }
    throw new Error(this.Exceptions.GROUP_NOT_FOUND);
  }

  private cleanupListItem(list: Post[]) {
    return list.map((item) => {
      const flatten = flattenObject(item, {
        alias: {
          'authorUser.ref': 'authorRef',
          'authorUser.nickname': 'authorNickname',
          'authorUser.profileImg': 'authorProfileImg',
          'authorUser.coverImg': 'authorCoverImg',
          'authorUser.introduce': 'authorIntroduce',
          'authorUser.teamId': 'authorTeamId',
        },
      }) as any;
      return {
        ...flatten,
        likes: item.likes.length,
        comments: item.comments.length,
      };
    });
  }

  async getPostById(
    id: number,
  ): Promise<{ post: Post; comments: Paginate<PostComment> }> {
    const post = await this.postRepo
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.authorUser', 'authorUser')
      .leftJoinAndSelect('post.likes', 'like')
      .leftJoinAndSelect('post.comments', 'comment')
      .addSelect('count(distinct like.id)', 'likeCount')
      .addSelect('count(distinct comment.id)', 'commentCount')
      .addSelect('authorUser.ref', 'authorRef')
      .addSelect('authorUser.name', 'authorName')
      .addSelect('authorUser.profileImg', 'authorProfileImg')
      .addSelect('authorUser.geo', 'authorGeo')
      .where('post.id = :id', { id })
      .getOne();
    if (post) {
      const comments = await this.listPostComments(id, {
        page: { pageNo: 1 },
      });
      return { post, comments };
    }
    throw new Error(this.Exceptions.POST_NOT_FOUND);
  }

  async listPostComments(
    id: number,
    options?: { page: PageQuery },
  ): Promise<Paginate<PostComment>> {
    const post = await this.postRepo.findOneBy({ id });
    if (post) {
      // setup page queries
      const size = options?.page ? options.page.pageSize : DEFAULT_PAGE_SIZE;
      const skip = options?.page
        ? (options.page.pageNo - 1) * options.page.pageSize
        : 0;
      const take = options?.page ? options.page.pageSize : size;
      // query post comment table
      const [list, count] = await this.commentRepo.findAndCount({
        where: { postId: id, deletedAt: null },
        order: { createdAt: 'DESC' },
        skip,
        take,
      });
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
    throw new Error(this.Exceptions.POST_NOT_FOUND);
  }

  async createPost(postInput: PostCreateDto): Promise<void> {
    const group = await this.groupRepo.findOneBy({ ref: postInput.groupRef });
    if (group) {
      const post = this.postRepo.create();
      post.author = postInput.author;
      post.groupId = group.id;
      post.image = postInput.image;
      post.message = postInput.message;
      await this.postRepo.save(post);
      return;
    }
    throw new Error(this.Exceptions.GROUP_NOT_FOUND);
  }

  async updatePost(
    sender: number,
    id: number,
    postInput: PostUpdateDto,
  ): Promise<void> {
    const post = await this.postRepo.findOneBy({ id });
    if (post) {
      if (post.author !== sender) {
        throw new Error(this.Exceptions.NOT_AUTHOR);
      }
      post.image = postInput.image;
      post.message = postInput.message;
      await this.postRepo.save(post);
      return;
    }
    throw new Error(this.Exceptions.POST_NOT_FOUND);
  }

  async likePost(id: number, userId: number): Promise<void> {
    const post = await this.postRepo.findOneBy({ id });
    if (post) {
      const like = await this.likeRepo.findOneBy({
        postId: id,
        author: userId,
      });
      if (like) {
        if (like.deletedAt) {
          like.deletedAt = null;
        } else {
          like.deletedAt = new Date();
        }
        await this.likeRepo.save(like);
      } else {
        await this.likeRepo.save({ postId: id, author: userId });
      }
      return;
    }
    throw new Error(this.Exceptions.POST_NOT_FOUND);
  }

  async createPostComment(
    postId: number,
    commentInput: PostCommentCreateDto,
  ): Promise<void> {
    const post = await this.postRepo.findOneBy({ id: postId });
    if (post) {
      const comment = this.commentRepo.create({
        ...commentInput,
        postId,
      });
      await this.commentRepo.save(comment);
      return;
    }
    throw new Error(this.Exceptions.POST_NOT_FOUND);
  }

  async deletePost(userId: number, id: number): Promise<void> {
    const post = await this.postRepo.findOneBy({ id });
    if (post) {
      if (post.author === userId) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
          await this.deletePostWithInjection(queryRunner, [id]);
          await queryRunner.commitTransaction();
        } catch (err) {
          await queryRunner.rollbackTransaction();
          throw err;
        } finally {
          await queryRunner.release();
        }
        return;
      }
      throw new Error(this.Exceptions.NOT_AUTHOR);
    }
    throw new Error(this.Exceptions.POST_NOT_FOUND);
  }

  async deletePostWithInjection(qr: QueryRunner, ids: number[]) {
    await qr.manager.delete(PostLike, { postId: In(ids) });
    await qr.manager.delete(PostComment, { postId: In(ids) });
    await qr.manager.delete(Post, { id: In(ids) });
    return;
  }

  async deletePostComment(userid: number, id: number): Promise<void> {
    const comment = await this.commentRepo.findOneBy({ id });
    if (comment) {
      if (comment.author === userid) {
        await this.commentRepo.delete({ id });
        return;
      }
      throw new Error(this.Exceptions.NOT_AUTHOR);
    }
    throw new Error(this.Exceptions.POST_NOT_FOUND);
  }
}
