import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Chat, ChatRoom, ChatRoomView } from '@/resources/chat/chat.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Chat, ChatRoom, ChatRoomView])],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
