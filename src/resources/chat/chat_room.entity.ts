import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Chat } from '@/resources/chat/chat.entity';

@Entity('chat_room')
export class ChatRoom {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({ unique: true })
  ref: string;
  @Column({ type: 'json' })
  members: number[];
  @Column({ nullable: true })
  createdAt: Date;
  @Column({ nullable: true })
  updatedAt: Date;
  @OneToMany(() => Chat, (chat) => chat.room)
  chats: Chat[];
}
