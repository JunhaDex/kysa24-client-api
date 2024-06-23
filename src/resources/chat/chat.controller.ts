import { Controller, Get, Param, Post, Put, Query, Res } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('recent')
  async listRecentChats(@Query() query: any, @Res() res: any) {
    return 'getRecentChats';
  }

  @Get('count')
  async countUnreadChats(@Query() query: any, @Res() res: any) {
    return 'countChats';
  }

  @Get('history/:uid')
  async getChatHistory(
    @Param('uid') uid: string,
    @Query() query: any,
    @Res() res: any,
  ) {
    return 'getChatHistory';
  }

  @Put('read/:uid')
  async markAsRead(@Param('uid') uid: string, @Res() res: any) {
    return 'markAsRead';
  }

  @Post('ticket/:uid')
  async sendInterestTicket(@Param('uid') uid: string, @Res() res: any) {
    return 'tickChat';
  }

  @Post('deny/:uid')
  async denyChat(@Param('uid') uid: string, @Res() res: any) {
    return 'denyChat';
  }
}
