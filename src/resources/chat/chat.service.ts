import { v4 as uuidv4 } from 'uuid';
import { Injectable, UseGuards } from '@nestjs/common';
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
import { messaging } from 'firebase-admin';
import NotificationMessagePayload = messaging.NotificationMessagePayload;
import { TicketMessageData } from '@/resources/noti/noti.type';

@Injectable()
@UseGuards(AuthGuard)
export class ChatService {
  static CHAT_SERVICE_EXCEPTIONS = {
    ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
    INVALID_USER: 'INVALID_USER',
  } as const;
  private readonly Exceptions = ChatService.CHAT_SERVICE_EXCEPTIONS;

  constructor(
    @InjectRepository(Chat) private readonly chatRepo: Repository<Chat>,
    @InjectRepository(ChatRoom) private readonly roomRepo: Repository<ChatRoom>,
    @InjectRepository(ChatRoomView)
    private readonly roomViewRepo: Repository<ChatRoomView>,
    @InjectRepository(ExpressTicket)
    private readonly ticketRepo: Repository<ExpressTicket>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly notiService: NotiService,
  ) {}

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
    const chatRooms = rooms.map((room) => {
      const flat = flattenObject(room, {
        exclude: ['room.chats'],
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
      console.log('room', room);
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

  async markAsRead(user: number, room: string): Promise<void> {
    const roomRead = await this.roomRepo.findOne({ where: { ref: room } });
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
        createdAt: Raw(
          `created_at > '${yesterday}' AND created_at <= '${today}'`,
        ),
      },
    });
    return dayMax - count > 0 ? dayMax - count : 0;
  }

  async sendUserExpressTicket(user: number, recipient: number): Promise<void> {
    const room = await this.getOrGenRoom(user, recipient);
    if (room) {
      const users = await this.userRepo.find({
        select: ['ref', 'nickname', 'profileImg'],
        where: {
          id: In([user, recipient]),
        },
      });
      const ticket = this.ticketRepo.create();
      ticket.userId = user;
      ticket.recipient = recipient;
      const chatMsg = this.chatRepo.create();
      chatMsg.roomId = room.id;
      chatMsg.sender = user;
      chatMsg.message = ':::type__express_ticket';
      chatMsg.encoded = true;
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        await queryRunner.manager.save(ticket);
        await queryRunner.manager.save(chatMsg);
        await queryRunner.commitTransaction();
      } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
      } finally {
        await queryRunner.release();
      }
      await this.notiService.sendNotification(recipient, 'ticket', {
        roomRef: room.ref,
        fromRef: users.filter((u) => u.id === user)[0].ref,
      } as TicketMessageData);
      return;
    }
    throw new Error(this.Exceptions.ROOM_NOT_FOUND);
  }

  async denyUserChat(
    user: number,
    blocker: number,
    isBlock = true,
  ): Promise<void> {
    const room = await this.getOrGenRoom(user, blocker);
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
