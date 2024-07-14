import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { PostService } from './post.service';
import { PageQuery } from '@/types/index.type';
import {
  fallbackCatch,
  formatResponse,
  validateBody,
} from '@/utils/index.util';
import { DEFAULT_PAGE_SIZE } from '@/constants/index.constant';
import {
  PostCommentCreateDto,
  PostCommentCreateDTOKeys,
  PostCreateDto,
  PostCreateDTOKeys,
  PostUpdateDto,
  PostUpdateDTOKeys,
} from '@/resources/post/post.type';
import { AuthGuard } from '@/guards/auth.guard';
import { AuthOptGuard } from '@/guards/option.guard';

@Controller('post')
export class PostController {
  constructor(private readonly postService: PostService) {}

  /**
   * [**Public**]
   *
   * List all posts in a group
   * @param groupRef
   * group reference uuidv4
   * @param query
   * - page: page number
   * - size: page size
   * @param req
   * @param res
   */
  @Get('feed/:gRef')
  @UseGuards(AuthOptGuard)
  async listPost(
    @Param('gRef') groupRef: string,
    @Query() query: any,
    @Req() req: any,
    @Res() res: any,
  ) {
    let page: PageQuery;
    if (query.page || query.size) {
      page = {
        pageNo: query.page ?? 1,
        pageSize: query.size ?? DEFAULT_PAGE_SIZE,
      };
    }
    try {
      const list = await this.postService.listPosts(groupRef, {
        page,
        sender: req['user']?.id,
      });
      return res
        .status(HttpStatus.OK)
        .send(formatResponse(HttpStatus.OK, list));
    } catch (e) {
      if (e.message === PostService.POST_SERVICE_EXCEPTIONS.GROUP_NOT_FOUND) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .send(formatResponse(HttpStatus.NOT_FOUND, 'Group not found'));
      }
      return fallbackCatch(e, res);
    }
  }

  /**
   * [**Public**]
   *
   * Get post detail by id
   * @param id
   * post id number
   * @param req
   * @param res
   * fastify response
   */
  @Get('detail/:id')
  @UseGuards(AuthOptGuard)
  async getPostById(@Param('id') id: string, @Req() req: any, @Res() res: any) {
    if (isNaN(Number(id))) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .send(formatResponse(HttpStatus.BAD_REQUEST, 'invalid post id'));
    }
    try {
      const post = await this.postService.getPostById(+id, {
        sender: req['user']?.id,
      });
      return res
        .status(HttpStatus.OK)
        .send(formatResponse(HttpStatus.OK, post));
    } catch (e) {
      if (e.message === PostService.POST_SERVICE_EXCEPTIONS.POST_NOT_FOUND) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .send(formatResponse(HttpStatus.NOT_FOUND, 'Post not found'));
      }
      return fallbackCatch(e, res);
    }
  }

  /**
   * [**Public**]
   *
   * Get post replies by post id
   * @param id
   * post id number
   * @param query
   * - page: page number
   * - size: page size
   * @param res
   * fastify response
   */
  @Get(':id/reply')
  async getPostReply(
    @Param('id') id: string,
    @Query() query: any,
    @Res() res: any,
  ) {
    if (isNaN(Number(id))) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .send(formatResponse(HttpStatus.BAD_REQUEST, 'invalid post id'));
    }
    let page: PageQuery;
    if (query.page || query.size) {
      page = {
        pageNo: query.page ?? 1,
        pageSize: query.size ?? DEFAULT_PAGE_SIZE,
      };
    }
    try {
      const list = await this.postService.listPostComments(+id, { page });
      return res
        .status(HttpStatus.OK)
        .send(formatResponse(HttpStatus.OK, list));
    } catch (e) {
      if (e.message() === PostService.POST_SERVICE_EXCEPTIONS.POST_NOT_FOUND) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .send(formatResponse(HttpStatus.NOT_FOUND, 'Post not found'));
      }
      return fallbackCatch(e, res);
    }
  }

  /**
   * Create a new post
   * @param body
   * - groupRef: group reference uuidv4
   * - message: string
   * - image: image url
   * @param req
   * @param res
   */
  @Post('new')
  @UseGuards(AuthGuard)
  async createPost(
    @Body() body: PostCreateDto,
    @Req() req: any,
    @Res() res: any,
  ) {
    if (validateBody(PostCreateDTOKeys, body)) {
      const author = req['user'].id;
      try {
        await this.postService.createPost(author, body);
        return res
          .status(HttpStatus.CREATED)
          .send(formatResponse(HttpStatus.CREATED, 'post created'));
      } catch (e) {
        if (e.message === PostService.POST_SERVICE_EXCEPTIONS.GROUP_NOT_FOUND) {
          return res
            .status(HttpStatus.NOT_FOUND)
            .send(formatResponse(HttpStatus.NOT_FOUND, 'group not found'));
        } else if (
          e.message === PostService.POST_SERVICE_EXCEPTIONS.GROUP_ROLE_INVALID
        ) {
          return res
            .status(HttpStatus.FORBIDDEN)
            .send(formatResponse(HttpStatus.FORBIDDEN, 'group role invalid'));
        }
        return fallbackCatch(e, res);
      }
    }
    return res
      .status(HttpStatus.FORBIDDEN)
      .send(formatResponse(HttpStatus.FORBIDDEN, 'invalid request'));
  }

  /**
   * Update a post
   * @param id
   * post id number
   * @param body
   * - message: string
   * - image: image url (optional)
   * @param req
   * fastify request
   * @param res
   * fastify response
   */
  @Patch(':id')
  @UseGuards(AuthGuard)
  async updatePost(
    @Param('id') id: string,
    @Body() body: PostUpdateDto,
    @Req() req: any,
    @Res() res: any,
  ) {
    if (isNaN(Number(id))) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .send(formatResponse(HttpStatus.BAD_REQUEST, 'invalid post id'));
    }
    if (validateBody(PostUpdateDTOKeys, body)) {
      const userId = req['user'].id;
      try {
        await this.postService.updatePost(userId, +id, body);
        return res
          .status(HttpStatus.OK)
          .send(formatResponse(HttpStatus.OK, 'post updated'));
      } catch (e) {
        if (e.message === PostService.POST_SERVICE_EXCEPTIONS.POST_NOT_FOUND) {
          return res
            .status(HttpStatus.NOT_FOUND)
            .send(formatResponse(HttpStatus.NOT_FOUND, 'post not found'));
        } else if (
          e.message === PostService.POST_SERVICE_EXCEPTIONS.NOT_AUTHOR
        ) {
          return res
            .status(HttpStatus.FORBIDDEN)
            .send(formatResponse(HttpStatus.FORBIDDEN, 'not author'));
        }
        return fallbackCatch(e, res);
      }
    }
    return res
      .status(HttpStatus.FORBIDDEN)
      .send(formatResponse(HttpStatus.FORBIDDEN, 'invalid request'));
  }

  /**
   * Like a post
   * @param id
   * @param query
   * - undo: boolean (optional, default false)
   * @param req
   * @param res
   */
  @Put('like/:id')
  @UseGuards(AuthGuard)
  async likePost(
    @Param('id') id: string,
    @Query() query: any,
    @Req() req: any,
    @Res() res: any,
  ) {
    if (isNaN(Number(id))) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .send(formatResponse(HttpStatus.BAD_REQUEST, 'invalid post id'));
    }
    try {
      const undo = query?.undo === 'true';
      await this.postService.likePost(+id, req['user'].id, undo);
      return res
        .status(HttpStatus.OK)
        .send(formatResponse(HttpStatus.OK, 'post liked'));
    } catch (e) {
      if (e.message === PostService.POST_SERVICE_EXCEPTIONS.POST_NOT_FOUND) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .send(formatResponse(HttpStatus.NOT_FOUND, 'post not found'));
      }
      return fallbackCatch(e, res);
    }
  }

  /**
   * Create a new reply
   * @param id
   * post id number
   * @param body
   * - message: string
   * @param req
   * fastify request
   * @param res
   * fastify response
   */
  @Post(':id/reply/new')
  @UseGuards(AuthGuard)
  async createReply(
    @Param('id') id: string,
    @Body() body: PostCommentCreateDto,
    @Req() req: any,
    @Res() res: any,
  ) {
    if (isNaN(Number(id))) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .send(formatResponse(HttpStatus.BAD_REQUEST, 'invalid post id'));
    }
    if (validateBody(PostCommentCreateDTOKeys, body)) {
      const author = req['user'].id;
      try {
        await this.postService.createPostComment(author, +id, body);
        return res
          .status(HttpStatus.CREATED)
          .send(formatResponse(HttpStatus.CREATED, 'reply created'));
      } catch (e) {
        if (e.message === PostService.POST_SERVICE_EXCEPTIONS.POST_NOT_FOUND) {
          return res
            .status(HttpStatus.NOT_FOUND)
            .send(formatResponse(HttpStatus.NOT_FOUND, 'post not found'));
        }
        return fallbackCatch(e, res);
      }
    }
    return res
      .status(HttpStatus.FORBIDDEN)
      .send(formatResponse(HttpStatus.FORBIDDEN, 'invalid request'));
  }

  /**
   * Delete a post
   * @param id
   * post id number
   * @param req
   * fastify request
   * @param res
   * fastify response
   */
  @Delete(':id/delete')
  @UseGuards(AuthGuard)
  async deletePost(@Param('id') id: string, @Req() req: any, @Res() res: any) {
    if (isNaN(Number(id))) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .send(formatResponse(HttpStatus.BAD_REQUEST, 'invalid post id'));
    }
    try {
      await this.postService.deletePost(req['user'].id, +id);
      return res
        .status(HttpStatus.OK)
        .send(formatResponse(HttpStatus.OK, 'post deleted'));
    } catch (e) {
      if (e.message === PostService.POST_SERVICE_EXCEPTIONS.POST_NOT_FOUND) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .send(formatResponse(HttpStatus.NOT_FOUND, 'post not found'));
      } else if (e.message === PostService.POST_SERVICE_EXCEPTIONS.NOT_AUTHOR) {
        return res
          .status(HttpStatus.FORBIDDEN)
          .send(formatResponse(HttpStatus.FORBIDDEN, 'not author'));
      }
      return fallbackCatch(e, res);
    }
  }

  /**
   * Delete a reply
   * @param id
   * post id number
   * @param rid
   * reply id number
   * @param req
   * fastify request
   * @param res
   * fastify response
   */
  @Delete(':id/reply/:rid/delete')
  @UseGuards(AuthGuard)
  async deleteReply(
    @Param('id') id: string,
    @Param('rid') rid: string,
    @Req() req: any,
    @Res() res: any,
  ) {
    if (isNaN(Number(id)) || isNaN(Number(rid))) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .send(formatResponse(HttpStatus.BAD_REQUEST, 'invalid post id'));
    }
    try {
      await this.postService.deletePostComment(req['user'].id, +rid);
      return res
        .status(HttpStatus.OK)
        .send(formatResponse(HttpStatus.OK, 'reply deleted'));
    } catch (e) {
      if (e.message === PostService.POST_SERVICE_EXCEPTIONS.POST_NOT_FOUND) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .send(formatResponse(HttpStatus.NOT_FOUND, 'post not found'));
      } else if (e.message === PostService.POST_SERVICE_EXCEPTIONS.NOT_AUTHOR) {
        return res
          .status(HttpStatus.FORBIDDEN)
          .send(formatResponse(HttpStatus.FORBIDDEN, 'not author'));
      }
      return fallbackCatch(e, res);
    }
  }
}
