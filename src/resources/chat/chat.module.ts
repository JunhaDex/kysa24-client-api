import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Chat,
  ChatRoomView,
  ExpressTicket,
} from '@/resources/chat/chat.entity';
import { ChatRoom } from '@/resources/chat/chat_room.entity';
import { User, UserDevice } from '@/resources/user/user.entity';
import { NotiService } from '@/resources/noti/noti.service';
import { Notification } from '@/resources/noti/noti.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Chat,
      ChatRoom,
      ChatRoomView,
      ExpressTicket,
      User,
      Notification,
      UserDevice,
    ]),
  ],
  controllers: [ChatController],
  providers: [ChatService, NotiService],
})
export class ChatModule {}
