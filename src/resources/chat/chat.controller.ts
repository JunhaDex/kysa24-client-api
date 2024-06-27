import {
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { PageQuery } from '@/types/index.type';
import { AuthGuard } from '@/guards/auth.guard';

@Controller('chat')
@UseGuards(AuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('recent')
  async listRecentChats(@Query() query: any, @Req() req: any, @Res() res: any) {
    const user = req['user'].id;
    let page: PageQuery;
    if (query.page || query.size) {
      page = {
        pageNo: query.page ?? 1,
        pageSize: query.size ?? 10,
      };
    }
    const list = await this.chatService.listChatRooms(user, { page });
    return res.status(200).send(list);
  }

  @Get('count')
  async countUnreadChats(@Query() query: any, @Res() res: any) {
    return 'countChats';
  }

  @Get('history/:ref')
  async getChatHistory(
    @Param('ref') ref: string,
    @Query() query: any,
    @Res() res: any,
  ) {
    return 'getChatHistory';
  }

  @Put('read/:ref')
  async markAsRead(@Param('ref') ref: string, @Res() res: any) {
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

  @Post('online')
  async updateOnlineStatus(@Res() res: any) {
    return 'updateOnlineStatus';
  }
}
