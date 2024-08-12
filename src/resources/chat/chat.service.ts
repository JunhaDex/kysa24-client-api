import { v4 as uuidv4 } from 'uuid';
import { Inject, Injectable, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/guards/auth.guard';
import {
  Chat,
  ChatRoomView,
  ExpressTicket,
} from '@/resources/chat/chat.entity';
import { DataSource, In, LessThanOrEqual, Raw, Repository } from 'typeorm';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { PageQuery, Paginate } from '@/types/index.type';
import {
  DEFAULT_PAGE_SIZE,
  DEFAULT_TICKET_COUNT,
  EMPTY_PAGE,
} from '@/constants/index.constant';
import { ChatRoomDao } from '@/resources/chat/chat.type';
import { User } from '@/resources/user/user.entity';
import { ChatRoom } from '@/resources/chat/chat_room.entity';
import { flattenObject } from '@/utils/index.util';
import dayjs from 'dayjs';
import { NotiService } from '@/resources/noti/noti.service';
import { TicketMessageData } from '@/resources/noti/noti.type';
import { UserService } from '@/resources/user/user.service';
import { Redis } from 'ioredis';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
@UseGuards(AuthGuard)
export class ChatService {
  static CHAT_SERVICE_EXCEPTIONS = {
    ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
    INVALID_USER: 'INVALID_USER',
    CHAT_DENIED: 'CHAT_DENIED',
  } as const;
  private readonly Exceptions = ChatService.CHAT_SERVICE_EXCEPTIONS;
  private readonly redisClient: Redis;

  constructor(
    @InjectRepository(Chat) private readonly chatRepo: Repository<Chat>,
    @InjectRepository(ChatRoom) private readonly roomRepo: Repository<ChatRoom>,
    @InjectRepository(ChatRoomView)
    private readonly roomViewRepo: Repository<ChatRoomView>,
    @InjectRepository(ExpressTicket)
    private readonly ticketRepo: Repository<ExpressTicket>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly userSerivce: UserService,
    private readonly notiService: NotiService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {
    this.redisClient = (this.cacheManager as any).store.getClient();
  }

  async listChatRooms(
    user: number,
    options?: { page?: PageQuery; isBlock?: boolean },
  ): Promise<Paginate<ChatRoomDao>> {
    const size = options?.page ? options.page.pageSize : DEFAULT_PAGE_SIZE;
    const skip = options?.page
      ? (options.page.pageNo - 1) * options.page.pageSize
      : 0;
    const take = options?.page ? options.page.pageSize : size;
    const blockType = !!options?.isBlock;
    // list my room view
    const [rooms, count] = await this.roomViewRepo.findAndCount({
      select: {
        id: true,
        roomId: true,
        userId: true,
        title: true,
        isBlock: true,
        lastRead: true,
        room: {
          ref: true,
          members: true,
          chats: {
            id: true,
            createdAt: true,
          },
        },
      },
      where: { userId: user, isBlock: blockType },
      skip,
      take,
      relations: {
        room: { chats: true },
      },
      order: {
        room: { chats: { createdAt: 'DESC' } },
      },
    });
    if (!rooms.length) return EMPTY_PAGE as Paginate<ChatRoomDao>;
    // getting all unique member id
    const usrSet = new Set<number>();
    rooms.forEach((r) => {
      r.room.members.forEach((m) => usrSet.add(m));
    });
    // remove my id
    const usrIds = Array.from(usrSet).filter((m) => m !== user);
    const users = await this.userSerivce.getUserInfoById(usrIds);
    const listChatsRaw = await this.chatRepo
      .createQueryBuilder('chat')
      .innerJoin(
        (sq) => {
          return sq
            .select('room_id, MAX(created_at) as max_created_at')
            .from(Chat, 'chat')
            .where('room_id IN (:...roomIds)', {
              roomIds: rooms.map((r) => r.roomId),
            })
            .groupBy('room_id');
        },
        'chat_max',
        'chat_max.room_id = chat.room_id AND chat_max.max_created_at = chat.created_at',
      )
      .getRawMany();
    const listChats = listChatsRaw.map((chatRaw) => {
      return flattenObject(chatRaw, {
        exclude: ['max_created_at'],
        alias: {
          chat_id: 'chatId',
          chat_room_id: 'roomId',
          chat_sender: 'sender',
          chat_message: 'message',
          chat_encoded: 'encoded',
          chat_created_at: 'createdAt',
          chat_updated_at: 'updatedAt',
        },
      }) as Chat[];
    });
    const chatRooms = rooms.map((room: any) => {
      room.party = users.filter((u) => room.room.members.includes(u.id));
      const flat = flattenObject(room, {
        exclude: ['room.chats', 'room.members'],
        alias: {
          'room.ref': 'ref',
        },
      }) as ChatRoomView;
      return this.getLatestChat(flat, listChats);
    });
    return {
      meta: {
        pageNo: options?.page?.pageNo ?? 1,
        pageSize: size,
        totalPage: Math.ceil(count / size),
        totalCount: count,
      },
      list: chatRooms,
    };
  }

  private getLatestChat(chatRoomView: ChatRoomView, chats: any[]): ChatRoomDao {
    const dao = chatRoomView as ChatRoomDao;
    dao.lastChat = chats.find((chat) => chat.roomId === chatRoomView.roomId);
    return dao;
  }

  private async getOrGenRoom(user: number, target: number): Promise<ChatRoom> {
    const userExists = await this.userRepo.findOneBy({ id: user });
    const targetExists = await this.userRepo.findOneBy({ id: target });
    if (user !== target && userExists && targetExists) {
      const sorted = [user, target].sort();
      const users = await this.userRepo.find({
        select: ['id', 'nickname'],
        where: {
          id: In(sorted),
        },
      });
      const titleWithNick = (except: number) => {
        return users
          .filter((u) => u.id !== except)
          .map((u) => u.nickname)
          .join(', ');
      };
      const room = await this.roomRepo.findOne({
        where: { members: Raw(`json_array(${sorted.join(',')})`) },
      });
      if (room) {
        return room;
      } else {
        const newRoom = this.roomRepo.create();
        newRoom.ref = uuidv4();
        newRoom.members = sorted.map((id) => Number(id));
        const views = sorted.map((id) => {
          const view = this.roomViewRepo.create();
          view.userId = id;
          view.title = titleWithNick(id);
          view.isBlock = false;
          view.lastRead = 0;
          return view;
        });
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
          const rc = await queryRunner.manager.save(newRoom);
          console.log('room created', rc.id);
          await queryRunner.manager.save(
            views.map((v) => {
              v.roomId = rc.id;
              return v;
            }),
          );
          await queryRunner.commitTransaction();
        } catch (err) {
          await queryRunner.rollbackTransaction();
          throw err;
        } finally {
          await queryRunner.release();
        }
        return await this.roomRepo.findOneBy({ id: newRoom.id });
      }
    }
    throw new Error(this.Exceptions.INVALID_USER);
  }

  async checkAccessRoom(sender: number, ref: string) {
    const rv = await this.roomViewRepo.findOne({
      where: { userId: sender, room: { ref } },
      relations: ['room'],
    });
    if (!rv) {
      throw new Error(this.Exceptions.ROOM_NOT_FOUND);
    }
  }

  async getTotalUnreadCount(user: number): Promise<number> {
    const countByRoom = await this.roomViewRepo
      .createQueryBuilder('view')
      .select(['view.room_id AS room_id', 'COUNT(view.id) AS unread_count'])
      .leftJoin(Chat, 'chat', 'chat.room_id = view.room_id')
      .where('view.user_id = :user', { user })
      .andWhere('chat.id > view.last_read')
      .andWhere('view.is_block = false')
      .groupBy('view.room_id')
      .getRawMany();
    return countByRoom.reduce((acc, item) => {
      return acc + Number(item.unread_count);
    }, 0);
  }

  async getChatRoomByUserDM(
    myId: number,
    targetRef: string,
  ): Promise<ChatRoom> {
    const target = await this.userRepo.findOneBy({ ref: targetRef });
    if (target) {
      const room = await this.getOrGenRoom(myId, target.id);
      const myView = await this.roomViewRepo.findOneBy({
        userId: myId,
        roomId: room.id,
      });
      if (myView) {
        if (!myView.isBlock) {
          return room;
        } else {
          throw new Error(this.Exceptions.CHAT_DENIED);
        }
      }
    }
    throw new Error(this.Exceptions.ROOM_NOT_FOUND);
  }

  async listChatHistory(
    roomRef: string,
    options?: { page?: PageQuery; anchor?: number },
  ): Promise<Paginate<Chat>> {
    const room = await this.roomRepo.findOne({ where: { ref: roomRef } });
    const anchor = options?.anchor ?? Number.MAX_SAFE_INTEGER;
    if (room) {
      const size = options?.page ? options.page.pageSize : DEFAULT_PAGE_SIZE;
      const skip = options?.page ? (options.page.pageNo - 1) * size : 0;
      const take = options?.page ? options.page.pageSize : size;
      const [chats, count] = await this.chatRepo.findAndCount({
        where: { roomId: room.id, id: LessThanOrEqual(anchor) },
        skip,
        take,
        order: { createdAt: 'DESC' },
      });
      return {
        meta: {
          pageNo: options?.page?.pageNo ?? 1,
          pageSize: size,
          totalPage: Math.ceil(count / size),
          totalCount: count,
        },
        list: chats,
      };
    }
    return EMPTY_PAGE as Paginate<Chat>;
  }

  async getChatRoomViewDetail(
    roomRef: string,
    senderId: number,
  ): Promise<{
    chatRoom: ChatRoomView;
    users: User[];
  }> {
    const room = await this.roomRepo.findOne({ where: { ref: roomRef } });
    if (room) {
      const rv = await this.roomViewRepo.findOne({
        where: { userId: senderId, roomId: room.id },
      });
      const users = await this.userSerivce.getUserInfoById(room.members);
      return {
        chatRoom: rv,
        users,
      };
    }
    throw new Error(this.Exceptions.ROOM_NOT_FOUND);
  }

  async markAsRead(user: number, roomRef: string): Promise<void> {
    const roomRead = await this.roomRepo.findOneBy({ ref: roomRef });
    if (roomRead) {
      const roomView = await this.roomViewRepo.findOne({
        where: { roomId: roomRead.id, userId: user },
      });
      const latestChat = await this.chatRepo.findOne({
        where: { roomId: roomRead.id },
        order: { createdAt: 'DESC' },
      });
      if (latestChat && roomView) {
        roomView.lastRead = latestChat.id;
        await this.roomViewRepo.save(roomView);
      }
      return;
    }
    throw new Error(this.Exceptions.ROOM_NOT_FOUND);
  }

  async countTicketRemainToday(user: number): Promise<number> {
    const now = Date.now();
    const today = dayjs(now).tz().format('YYYY-MM-DD 23:59:59');
    const yesterday = dayjs(now).tz().subtract(1, 'day').format('YYYY-MM-DD');
    const dayMax = DEFAULT_TICKET_COUNT;
    const count = await this.ticketRepo.count({
      where: {
        userId: user,
        createdAt: Raw((q: any) => `${q} > :yesterday AND ${q} <= :today`, {
          yesterday,
          today,
        }),
      },
    });
    return dayMax - count > 0 ? dayMax - count : 0;
  }

  async sendUserExpressTicket(
    user: User,
    toRef: string,
    options?: {
      isReply: boolean;
      originId?: number;
    },
  ): Promise<void> {
    const recipient = await this.userRepo.findOneBy({ ref: toRef });
    const room = await this.getOrGenRoom(user.id, recipient.id);
    const count = await this.countTicketRemainToday(user.id);
    if (room && count > 0) {
      const ticket = this.ticketRepo.create();
      ticket.userId = user.id;
      ticket.recipient = recipient.id;
      const chatMsg = this.chatRepo.create();
      chatMsg.roomId = room.id;
      chatMsg.sender = user.id;
      chatMsg.message = ':::type__express_ticket:::';
      chatMsg.encoded = true;
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      let pubPayload: Chat;
      try {
        await queryRunner.manager.save(ticket);
        const chat = await queryRunner.manager.save(chatMsg);
        if (options?.isReply && options.originId) {
          const msgs = this.getTicketReplyMsg(
            user,
            recipient,
            options.originId,
            chat.id,
          );
          await queryRunner.manager.update(Chat, chat.id, {
            message: msgs.reply,
          });
          await queryRunner.manager.update(Chat, options.originId, {
            message: msgs.origin,
          });
          pubPayload = { ...chat, message: msgs.reply };
        } else {
          const msg = this.genTicketSendMsg(user, recipient, chat.id);
          await queryRunner.manager.update(Chat, chat.id, {
            message: msg,
          });
          pubPayload = { ...chat, message: msg };
        }
        await queryRunner.commitTransaction();
      } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
      } finally {
        await queryRunner.release();
      }
      await this.redisClient.publish(
        'live-chat',
        JSON.stringify({ recipients: [recipient.ref], chat: pubPayload }),
      );
      await this.notiService.sendNotification(recipient.id, 'ticket', {
        roomRef: room.ref,
        fromRef: user.ref,
      } as TicketMessageData);
      return;
    }
    throw new Error(this.Exceptions.ROOM_NOT_FOUND);
  }

  private genTicketSendMsg(from: User, to: User, chatId: number) {
    const prefix = ':::type__express_ticket:::';
    const msg = {
      chatId,
      type: 'ticket',
      from: {
        ref: from.ref,
        nickname: from.nickname,
      },
      to: {
        ref: to.ref,
        nickname: to.nickname,
      },
      replied: false,
    };
    return `${prefix}${JSON.stringify(msg)}`;
  }

  private getTicketReplyMsg(
    from: User,
    to: User,
    originId: number,
    replyId: number,
  ): { reply: string; origin: string } {
    const prefix = ':::type__express_ticket:::';
    const reply = {
      chatId: replyId,
      type: 'reply',
      from: {
        ref: from.ref,
        nickname: from.nickname,
      },
      to: {
        ref: to.ref,
        nickname: to.nickname,
      },
    };
    const origin = {
      chatId: originId,
      type: 'ticket',
      from: {
        ref: to.ref,
        nickname: to.nickname,
      },
      to: {
        ref: from.ref,
        nickname: from.nickname,
      },
      replied: true,
    };
    return {
      reply: `${prefix}${JSON.stringify(reply)}`,
      origin: `${prefix}${JSON.stringify(origin)}`,
    };
  }

  async denyUserChat(
    user: number,
    blockerRef: string,
    isBlock = true,
  ): Promise<void> {
    const blocker = await this.userRepo.findOneBy({ ref: blockerRef });
    const room = await this.getOrGenRoom(user, blocker.id);
    if (room) {
      const blockView = await this.roomViewRepo.findOne({
        where: { roomId: room.id, userId: user },
      });
      if (blockView) {
        blockView.isBlock = isBlock;
        await this.roomViewRepo.save(blockView);
      }
    }
    return;
  }

  async pushOnlineStatus(user: number, isOnline = true): Promise<void> {}
}
