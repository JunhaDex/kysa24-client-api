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
import { User } from '@/resources/user/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Chat,
      ChatRoom,
      ChatRoomView,
      ExpressTicket,
      User,
    ]),
  ],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
