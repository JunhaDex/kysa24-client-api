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
  PostCommentCreateDTOKeys,
  PostCreateDto,
  PostCreateDTOKeys,
  PostUpdateDTOKeys,
} from '@/resources/post/post.type';

@Controller('post')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Get(':gRef')
  async listPost(
    @Param('gRef') groupRef: string,
    @Query() query: any,
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
      const list = await this.postService.listPosts(groupRef, { page });
      return res
        .status(HttpStatus.OK)
        .send(formatResponse(HttpStatus.OK, list));
    } catch (e) {
      if (e.message === PostService.POST_SERVICE_EXCEPTIONS.GROUP_NOT_FOUND) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .send(formatResponse(HttpStatus.NOT_FOUND, 'Group not found'));
      }
      return fallbackCatch(res, e);
    }
  }

  @Get(':id')
  async getPost(@Param('id') id: string, @Res() res: any) {

  }

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
      return fallbackCatch(res, e);
    }
  }

  @Post('new')
  async createPost(
    @Body() body: PostCreateDto,
    @Req() req: any,
    @Res() res: any,
  ) {
    if (validateBody(PostCreateDTOKeys, body)) {
      if (req['user'].id === body.author) {
        try {
          await this.postService.createPost(body);
          return res
            .status(HttpStatus.CREATED)
            .send(formatResponse(HttpStatus.CREATED, 'post created'));
        } catch (e) {
          if (
            e.message === PostService.POST_SERVICE_EXCEPTIONS.GROUP_NOT_FOUND
          ) {
            return res
              .status(HttpStatus.FORBIDDEN)
              .send(formatResponse(HttpStatus.FORBIDDEN, 'group not found'));
          }
          return fallbackCatch(res, e);
        }
      }
    }
    return res
      .status(HttpStatus.FORBIDDEN)
      .send(formatResponse(HttpStatus.FORBIDDEN, 'invalid request'));
  }

  @Patch(':id')
  async updatePost(
    @Param('id') id: string,
    @Body() body: any,
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
        return fallbackCatch(res, e);
      }
    }
  }

  @Put('like/:id')
  async likePost(@Param('id') id: string, @Req() req: any, @Res() res: any) {
    if (isNaN(Number(id))) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .send(formatResponse(HttpStatus.BAD_REQUEST, 'invalid post id'));
    }
    try {
      await this.postService.likePost(+id, req['user'].id);
      return res
        .status(HttpStatus.OK)
        .send(formatResponse(HttpStatus.OK, 'post liked'));
    } catch (e) {
      if (e.message === PostService.POST_SERVICE_EXCEPTIONS.POST_NOT_FOUND) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .send(formatResponse(HttpStatus.NOT_FOUND, 'post not found'));
      }
      return fallbackCatch(res, e);
    }
  }

  @Post(':id/reply/new')
  async createReply(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req: any,
    @Res() res: any,
  ) {
    if (isNaN(Number(id))) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .send(formatResponse(HttpStatus.BAD_REQUEST, 'invalid post id'));
    }
    if (validateBody(PostCommentCreateDTOKeys, body)) {
      if (req['user'].id === body.author) {
        try {
          await this.postService.createPostComment(+id, body);
          return res
            .status(HttpStatus.CREATED)
            .send(formatResponse(HttpStatus.CREATED, 'reply created'));
        } catch (e) {
          if (
            e.message === PostService.POST_SERVICE_EXCEPTIONS.POST_NOT_FOUND
          ) {
            return res
              .status(HttpStatus.NOT_FOUND)
              .send(formatResponse(HttpStatus.NOT_FOUND, 'post not found'));
          }
          return fallbackCatch(res, e);
        }
      }
    }
    return res
      .status(HttpStatus.FORBIDDEN)
      .send(formatResponse(HttpStatus.FORBIDDEN, 'invalid request'));
  }

  @Delete(':id/delete')
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
      return fallbackCatch(res, e);
    }
  }

  @Delete(':id/reply/:rid/delete')
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
      return fallbackCatch(res, e);
    }
  }
}
