import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Res,
} from '@nestjs/common';
import { PostService } from './post.service';

@Controller('post')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Get(':id')
  async getPost(@Param('id') id: string, @Res() res: any) {
    return 'getPost';
  }

  @Get(':id/reply')
  async getPostReply(@Param('id') id: string, @Res() res: any) {
    return 'getPostReply';
  }

  @Post('new')
  async createPost(@Body() body: any, @Res() res: any) {
    return 'createPost';
  }

  @Patch(':id')
  async updatePost(
    @Param('id') id: string,
    @Body() body: any,
    @Res() res: any,
  ) {
    return 'updatePost';
  }

  @Put('like/:id')
  async likePost(@Param('id') id: string, @Res() res: any) {
    return 'likePost';
  }

  @Post(':id/reply/new')
  async createReply(
    @Param('id') id: string,
    @Body() body: any,
    @Res() res: any,
  ) {
    return 'createReply';
  }

  @Post('online')
  async updateOnlineStatus(@Res() res: any) {
    return 'updateOnlineStatus';
  }

  @Delete(':id/delete')
  async deletePost(@Param('id') id: string, @Res() res: any) {
    return 'deletePost';
  }

  @Delete(':id/reply/:rid/delete')
  async deleteReply(
    @Param('id') id: string,
    @Param('rid') rid: string,
    @Res() res: any,
  ) {
    return 'deleteReply';
  }
}
