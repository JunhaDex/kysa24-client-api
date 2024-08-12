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

  @Get('user/:ref')
  async getChatRoomByUser(
    @Param('ref') ref: string,
    @Req() req: any,
    @Res() res: any,
  ) {
    const user = req['user'].id;
    const myRef = req['user'].ref;
    if (ref === myRef) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .send(formatResponse(HttpStatus.BAD_REQUEST, 'invalid request'));
    }
    try {
      const room = await this.chatService.getChatRoomByUserDM(user, ref);
      return res
        .status(HttpStatus.OK)
        .send(formatResponse(HttpStatus.OK, room));
    } catch (e) {
      if (e.message === ChatService.CHAT_SERVICE_EXCEPTIONS.ROOM_NOT_FOUND) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .send(formatResponse(HttpStatus.NOT_FOUND, 'user not found'));
      } else if (
        e.message === ChatService.CHAT_SERVICE_EXCEPTIONS.CHAT_DENIED
      ) {
        return res
          .status(HttpStatus.FORBIDDEN)
          .send(formatResponse(HttpStatus.FORBIDDEN, 'chat denied'));
      }
      fallbackCatch(e, res);
    }
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
   * chat room ref
   * @param query
   * - page: number
   * - size: number
   * - begin-id: number // chat id max (get older chats)
   * @param req
   * fastify request object
   * @param res
   * fastify response object
   */
  @Get('history/:ref')
  async getChatHistory(
    @Param('ref') ref: string,
    @Query() query: any,
    @Req() req: any,
    @Res() res: any,
  ) {
    const user = req['user'];
    const page: PageQuery = {
      pageNo: query.page ?? 1,
      pageSize: query.size ?? DEFAULT_PAGE_SIZE,
    };
    const anchor = query['begin-id'];
    try {
      await this.chatService.checkAccessRoom(user.id, ref);
    } catch (e) {
      throw new Error(ChatService.CHAT_SERVICE_EXCEPTIONS.ROOM_NOT_FOUND);
    }
    const history = await this.chatService.listChatHistory(ref, {
      page,
      anchor: anchor ? Number(anchor) : undefined,
    });
    return res
      .status(HttpStatus.OK)
      .send(formatResponse(HttpStatus.OK, history));
  }

  /**
   * get chat users
   * @param ref
   * @param req
   * @param res
   */
  @Get('room/:ref/detail')
  async getChatUsers(
    @Param('ref') ref: string,
    @Req() req: any,
    @Res() res: any,
  ) {
    const user = req['user'];
    try {
      await this.chatService.checkAccessRoom(user.id, ref);
      const roomViewInfo = await this.chatService.getChatRoomViewDetail(
        ref,
        user.id,
      );
      return res
        .status(HttpStatus.OK)
        .send(formatResponse(HttpStatus.OK, roomViewInfo));
    } catch (e) {
      if (e.message === ChatService.CHAT_SERVICE_EXCEPTIONS.ROOM_NOT_FOUND) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .send(formatResponse(HttpStatus.NOT_FOUND, 'room not found'));
      }
      fallbackCatch(e, res);
    }
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
   * @param query
   * @param req
   * @param res
   */
  @Post('ticket/:ref')
  async sendExpressTicket(
    @Param('ref') toRef: string,
    @Query() query: any,
    @Req() req: any,
    @Res() res: any,
  ) {
    const sender = req['user'];
    try {
      const isReply = !!query.originId;
      const originId = query.originId ? Number(query.originId) : undefined;
      await this.chatService.sendUserExpressTicket(sender, toRef, {
        isReply,
        originId,
      });
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
