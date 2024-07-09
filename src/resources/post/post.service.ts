import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, QueryRunner, Repository } from 'typeorm';
import { Post, PostComment, PostLike } from '@/resources/post/post.entity';
import { PageQuery, Paginate } from '@/types/index.type';
import { Group, GroupUserFollow } from '@/resources/group/group.entity';
import { DEFAULT_PAGE_SIZE } from '@/constants/index.constant';
import {
  PostCommentCreateDto,
  PostCreateDto,
  PostUpdateDto,
} from '@/resources/post/post.type';
import { flattenObject } from '@/utils/index.util';
import { NotiService } from '@/resources/noti/noti.service';
import { GroupMessageData, PostMessageData } from '@/resources/noti/noti.type';
import { User } from '@/resources/user/user.entity';

@Injectable()
export class PostService {
  static POST_SERVICE_EXCEPTIONS = {
    GROUP_NOT_FOUND: 'GROUP_NOT_FOUND',
    POST_NOT_FOUND: 'POST_NOT_FOUND',
    NOT_AUTHOR: 'NOT_AN_AUTHOR',
    GROUP_ROLE_INVALID: 'GROUP_ROLE_INVALID',
  } as const;
  private readonly Exceptions = PostService.POST_SERVICE_EXCEPTIONS;

  constructor(
    @InjectRepository(Post) private postRepo: Repository<Post>,
    @InjectRepository(PostComment) private commentRepo: Repository<PostComment>,
    @InjectRepository(PostLike) private likeRepo: Repository<PostLike>,
    @InjectRepository(Group) private groupRepo: Repository<Group>,
    @InjectRepository(GroupUserFollow)
    private followRepo: Repository<GroupUserFollow>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectDataSource() private dataSource: DataSource,
    private readonly notiService: NotiService,
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
            deletedAt: true,
          },
          comments: {
            id: true,
            deletedAt: true,
          },
        },
        where: {
          groupId: group.id,
        },
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
        list: this.cleanupListItem(list) as Post[],
      };
    }
    throw new Error(this.Exceptions.GROUP_NOT_FOUND);
  }

  private cleanupAuthor<T>(item: any): T {
    return flattenObject(item, {
      alias: {
        'authorUser.ref': 'authorRef',
        'authorUser.nickname': 'authorNickname',
        'authorUser.profileImg': 'authorProfileImg',
        'authorUser.coverImg': 'authorCoverImg',
        'authorUser.introduce': 'authorIntroduce',
        'authorUser.teamId': 'authorTeamId',
      },
    }) as T;
  }

  private cleanupListItem(list: Post[]) {
    return list.map((item) => {
      const flatten = this.cleanupAuthor<Post>(item);
      return {
        ...flatten,
        likes: item.likes.filter((like) => !like.deletedAt).length,
        comments: item.comments.filter((comment) => !comment.deletedAt).length,
      } as unknown;
    });
  }

  async getPostById(
    id: number,
  ): Promise<{ post: Post; comments: Paginate<PostComment> }> {
    const post = await this.postRepo.findOne({
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
          deletedAt: true,
        },
        comments: {
          id: true,
          deletedAt: true,
        },
      },
      where: { id },
      relations: ['authorUser', 'likes', 'comments'],
    });
    if (post) {
      const clean = this.cleanupListItem([post]).pop() as Post;
      const comments = await this.listPostComments(id, {
        page: { pageNo: 1, pageSize: DEFAULT_PAGE_SIZE },
      });
      return { post: clean, comments };
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
        select: {
          id: true,
          author: true,
          postId: true,
          message: true,
          createdAt: true,
          deletedAt: true,
          authorUser: {
            ref: true,
            nickname: true,
            profileImg: true,
            coverImg: true,
            introduce: true,
            teamId: true,
          },
        },
        where: { postId: id, deletedAt: null },
        relations: ['authorUser'],
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
        list: list.map((item) => this.cleanupAuthor<PostComment>(item)),
      };
    }
    throw new Error(this.Exceptions.POST_NOT_FOUND);
  }

  async createPost(author: number, postInput: PostCreateDto): Promise<void> {
    const group = await this.groupRepo.findOneBy({ ref: postInput.groupRef });
    if (group) {
      const pa = await this.userRepo.findOneBy({ id: author });
      const followers = await this.followRepo.findBy({
        groupId: group.id,
      });
      const ids = followers.map((f) => f.follower);
      const role = await this.followRepo.findOneBy({
        groupId: group.id,
        follower: author,
      });
      if (role?.role === 'writer') {
        const post = this.postRepo.create();
        post.author = author;
        post.groupId = group.id;
        post.image = postInput.image;
        post.message = postInput.message;
        const newPost = await this.postRepo.save(post);
        await this.notiService.publishTopic(ids, 'group', {
          groupRef: group.ref,
          postId: newPost.id,
          authorNickname: pa.nickname,
        } as GroupMessageData);
        return;
      }
      throw new Error(this.Exceptions.GROUP_ROLE_INVALID);
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

  async likePost(id: number, userId: number, undo = false): Promise<void> {
    const post = await this.postRepo.findOneBy({ id });
    if (post) {
      const like = await this.likeRepo.findOneBy({
        postId: id,
        author: userId,
      });
      if (undo) {
        if (like && !like.deletedAt) {
          like.deletedAt = new Date();
          await this.likeRepo.save(like);
        }
      } else {
        if (like) {
          like.deletedAt = null;
          await this.likeRepo.save(like);
        } else {
          await this.likeRepo.save({ postId: id, author: userId });
        }
      }
      return;
    }
    throw new Error(this.Exceptions.POST_NOT_FOUND);
  }

  async createPostComment(
    author: number,
    postId: number,
    commentInput: PostCommentCreateDto,
  ): Promise<void> {
    const post = await this.postRepo.findOneBy({ id: postId });
    if (post) {
      const ca = await this.userRepo.findOneBy({ id: author });
      const comment = this.commentRepo.create({
        author,
        message: commentInput.message,
        postId,
      });
      await this.commentRepo.save(comment);
      await this.notiService.sendNotification(post.author, 'post', {
        postId,
        authorNickname: ca.nickname,
      } as PostMessageData);
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
