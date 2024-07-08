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
import { DEFAULT_PAGE_SIZE } from '@/constants/index.constant';

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
        pageSize: query.size ?? DEFAULT_PAGE_SIZE,
      };
    }
    const isBlock = query['is-block'] === 'true';
    const list = await this.chatService.listChatRooms(user, { page, isBlock });
    return res.status(HttpStatus.OK).send(formatResponse(HttpStatus.OK, list));
  }

  /**
   * count new chats
   * @param req
   * fastify request object
   * @param res
   * fastify response object
   */
  @Get('unread')
  async countUnreadChats(@Req() req: any, @Res() res: any) {
    const user = req['user'].id;
    const count = await this.chatService.getTotalUnreadCount(user);
    return res
      .status(HttpStatus.OK)
      .send(formatResponse(HttpStatus.OK, { count }));
  }

  /**
   * get chat history
   * @param ref
   * @param query
   * - page: number
   * - size: number
   * - begin-id: number // chat id max (get older chats)
   * @param res
   */
  @Get('history/:ref')
  async getChatHistory(
    @Param('ref') ref: string,
    @Query() query: any,
    @Res() res: any,
  ) {
    const page: PageQuery = {
      pageNo: query.page ?? 1,
      pageSize: query.size ?? DEFAULT_PAGE_SIZE,
    };
    const anchor = query['begin-id'];
    console.log(anchor);
    const history = await this.chatService.listChatHistory(ref, {
      page,
      anchor: anchor ? Number(anchor) : undefined,
    });
    return res
      .status(HttpStatus.OK)
      .send(formatResponse(HttpStatus.OK, history));
  }

  @Put('read/:ref')
  async markAsRead(
    @Param('ref') ref: string,
    @Req() req: any,
    @Res() res: any,
  ) {
    try {
      const user = req['user'].id;
      await this.chatService.markAsRead(user, ref);
      return res
        .status(HttpStatus.OK)
        .send(formatResponse(HttpStatus.OK, 'ok'));
    } catch (e) {
      if (e.message === ChatService.CHAT_SERVICE_EXCEPTIONS.ROOM_NOT_FOUND) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .send(formatResponse(HttpStatus.NOT_FOUND, 'room not found'));
      }
      fallbackCatch(e, res);
    }
  }

  @Get('ticket/count')
  async countTicketRemain(@Req() req: any, @Res() res: any) {
    const user = req['user'].id;
    const count = await this.chatService.countTicketRemainToday(user);
    return res
      .status(HttpStatus.OK)
      .send(formatResponse(HttpStatus.OK, { count }));
  }

  /**
   * Send express ticket to user
   * @param toRef
   * @param req
   * @param res
   */
  @Post('ticket/:ref')
  async sendExpressTicket(
    @Param('ref') toRef: string,
    @Req() req: any,
    @Res() res: any,
  ) {
    const sender = req['user'].id;
    try {
      await this.chatService.sendUserExpressTicket(sender, toRef);
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

  @Post('deny/:ref')
  async denyChat(
    @Param('ref') ref: string,
    @Body()
    body: {
      status: boolean;
    },
    @Req() req: any,
    @Res() res: any,
  ) {
    const requester = req['user'].id;
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
      const { status } = body;
      try {
        await this.chatService.denyUserChat(requester, ref, status);
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
