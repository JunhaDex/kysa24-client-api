import { Injectable, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/guards/auth.guard';
import { Chat, ChatRoom, ChatRoomView } from '@/resources/chat/chat.entity';
import { In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { PageQuery, Paginate } from '@/types/index.type';
import { DEFAULT_PAGE_SIZE, EMPTY_PAGE } from '@/constants/index.constant';
import { ChatRoomDao } from '@/resources/chat/chat.type';

@Injectable()
@UseGuards(AuthGuard)
export class ChatService {
  constructor(
    @InjectRepository(Chat) private readonly chatRepo: Repository<Chat>,
    @InjectRepository(ChatRoom) private readonly roomRepo: Repository<ChatRoom>,
    @InjectRepository(ChatRoomView)
    private readonly roomViewRepo: Repository<ChatRoomView>,
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
    const listChats = await this.chatRepo
      .createQueryBuilder('chat')
      .addSelect(['MAX(chat.createdAt) as max_created_at'])
      .groupBy('chat.roomId')
      .where('chat.roomId IN (:...rooms)', {
        rooms: rooms.map((r) => r.roomId),
      })
      .getRawMany();

    const chatRooms = rooms.map((room) => {
      return this.getLatestChat(room, listChats);
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

  async getTotalUnreadCount(user: number): Promise<number> {
    return 0;
  }

  async listChatHistory(roomRef: string): Promise<Paginate<Chat>> {
    return EMPTY_PAGE as Paginate<Chat>;
  }

  async markAsRead(user: number, room: number): Promise<void> {}

  async sendUserTicket(user: number, target: number): Promise<void> {}

  async denyUserChat(
    user: number,
    blocker: number,
    isBlock = true,
  ): Promise<void> {}

  async pushOnlineStatus(user: number, isOnline = true): Promise<void> {}
}
