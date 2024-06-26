import { Chat, ChatRoomView } from '@/resources/chat/chat.entity';

export interface ChatRoomDao extends ChatRoomView {
  lastChat: Chat;
}
