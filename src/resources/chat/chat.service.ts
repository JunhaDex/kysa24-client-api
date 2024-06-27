import { v4 as uuidv4 } from 'uuid';
import { Injectable, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/guards/auth.guard';
import {
  Chat,
  ChatRoomView,
  ExpressTicket,
} from '@/resources/chat/chat.entity';
import { DataSource, In, Repository } from 'typeorm';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { PageQuery, Paginate } from '@/types/index.type';
import { DEFAULT_PAGE_SIZE, EMPTY_PAGE } from '@/constants/index.constant';
import { ChatRoomDao } from '@/resources/chat/chat.type';
import { User } from '@/resources/user/user.entity';
import { ChatRoom } from '@/resources/chat/chat_room.entity';
import { flattenObject } from '@/utils/index.util';

@Injectable()
@UseGuards(AuthGuard)
export class ChatService {
  static CHAT_SERVICE_EXCEPTIONS = {
    ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
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
  ) {}

  async listChatRooms(
    user: number,
    options?: { page: PageQuery },
  ): Promise<Paginate<ChatRoomDao>> {
    const size = options?.page ? options.page.pageSize : DEFAULT_PAGE_SIZE;
    const skip = options?.page
      ? (options.page.pageNo - 1) * options.page.pageSize
      : 0;
    const take = options?.page ? options.page.pageSize : size;
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
      where: { userId: user },
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
      where: { members: JSON.stringify(sorted) },
    });
    if (room) {
      return room;
    } else {
      const newRoom = this.roomRepo.create();
      newRoom.ref = uuidv4();
      newRoom.members = sorted.map((id) => id.toString());
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
        await queryRunner.manager.save(newRoom);
        await queryRunner.manager.save(views);
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

  async getTotalUnreadCount(user: number): Promise<number> {
    return 0;
  }

  async listChatHistory(
    roomRef: string,
    options?: { page: PageQuery },
  ): Promise<Paginate<Chat>> {
    const room = await this.roomRepo.findOne({ where: { ref: roomRef } });
    if (room) {
      const size = options?.page ? options.page.pageSize : DEFAULT_PAGE_SIZE;
      const skip = options?.page ? (options.page.pageNo - 1) * size : 0;
      const take = options?.page ? options.page.pageSize : size;
      const [chats, count] = await this.chatRepo.findAndCount({
        where: { roomId: room.id },
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

  async markAsRead(user: number, room: number): Promise<void> {
    const roomView = await this.roomViewRepo.findOne({
      where: { roomId: room, userId: user },
    });
    const latestChat = await this.chatRepo.findOne({
      where: { roomId: room },
      order: { createdAt: 'DESC' },
    });
    if (latestChat && roomView) {
      roomView.lastRead = latestChat.id;
      await this.roomViewRepo.save(roomView);
    }
  }

  async countTicketRemainToday(user: number): Promise<number> {
    return 0;
  }

  async sendUserExpressTicket(user: number, recipient: number): Promise<void> {
    const room = await this.getOrGenRoom(user, recipient);
    if (room) {
      const ticket = this.ticketRepo.create();
      ticket.userId = user;
      ticket.recipient = recipient;
      const chatMsg = this.chatRepo.create();
      chatMsg.roomId = room.id;
      chatMsg.sender = user;
      chatMsg.message = 'express_ticket';
      chatMsg.encoded = true;
      await this.ticketRepo.save(ticket);
    }
    throw new Error(this.Exceptions.ROOM_NOT_FOUND);
  }

  async denyUserChat(
    user: number,
    blocker: number,
    isBlock = true,
  ): Promise<void> {}

  async pushOnlineStatus(user: number, isOnline = true): Promise<void> {}
}
