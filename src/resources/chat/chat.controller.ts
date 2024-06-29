import {
  Body,
  Controller,
  Get,
  HttpStatus,
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
import {
  fallbackCatch,
  formatResponse,
  validateBody,
} from '@/utils/index.util';

@Controller('chat')
@UseGuards(AuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   *
   * @param query
   * - page: number
   * - size: number
   * - list-type: boolean // false: regular, true: blocked
   * @param req
   * @param res
   */
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
    const isBlock = query['is-block'] === 'true';
    const list = await this.chatService.listChatRooms(user, { page, isBlock });
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
  async sendExpressTicket(
    @Param('uid') uid: string,
    @Req() req: any,
    @Res() res: any,
  ) {
    if (isNaN(Number(uid))) {
      return res
        .status(HttpStatus.FORBIDDEN)
        .send(formatResponse(HttpStatus.FORBIDDEN, 'invalid request'));
    }
    const sender = req['user'].id;
    const recipient = Number(uid);
    try {
      await this.chatService.sendUserExpressTicket(sender, recipient);
      return res
        .status(HttpStatus.OK)
        .send(formatResponse(HttpStatus.OK, 'ticket sent'));
    } catch (e) {
      if (e.message === ChatService.CHAT_SERVICE_EXCEPTIONS.INVALID_USER) {
        return res
          .status(HttpStatus.FORBIDDEN)
          .send(formatResponse(HttpStatus.FORBIDDEN, 'invalid user'));
      }
      fallbackCatch(e, res);
    }
  }

  @Post('deny/:uid')
  async denyChat(
    @Param('uid') uid: string,
    @Body()
    body: {
      status: boolean;
    },
    @Req() req: any,
    @Res() res: any,
  ) {
    if (isNaN(Number(uid))) {
      return res
        .status(HttpStatus.FORBIDDEN)
        .send(formatResponse(HttpStatus.FORBIDDEN, 'invalid request'));
    }
    const requester = req['user'].id;
    const blocker = Number(uid);
    if (
      validateBody(
        {
          status: {
            type: 'boolean',
            required: true,
          },
        },
        body,
      )
    ) {
      try {
        await this.chatService.denyUserChat(requester, blocker);
        return res
          .status(HttpStatus.OK)
          .send(formatResponse(HttpStatus.OK, 'chat denied'));
      } catch (e) {
        if (e.message === ChatService.CHAT_SERVICE_EXCEPTIONS.INVALID_USER) {
          return res
            .status(HttpStatus.FORBIDDEN)
            .send(formatResponse(HttpStatus.FORBIDDEN, 'invalid user'));
        }
        fallbackCatch(e, res);
      }
    }
    return res
      .status(HttpStatus.BAD_REQUEST)
      .send(formatResponse(HttpStatus.BAD_REQUEST, 'invalid request'));
  }

  @Post('online')
  async updateOnlineStatus(@Res() res: any) {
    return 'updateOnlineStatus';
  }
}
