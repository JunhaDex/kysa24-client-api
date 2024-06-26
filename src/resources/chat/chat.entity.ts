import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('chat')
export class Chat {
  @PrimaryGeneratedColumn()
  id: number;
  @Column()
  roomId: number;
  @Column()
  sender: number;
  @Column()
  message: string;
  @Column({ nullable: true })
  createdAt: Date;
  @Column({ nullable: true })
  updatedAt: Date;
  @ManyToOne(() => ChatRoom)
  @JoinColumn({ name: 'roomId' })
  room: ChatRoom;
}

@Entity('chat_room')
export class ChatRoom {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({ unique: true })
  ref: string;
  @Column({ type: 'json' })
  members: string[];
  @Column({ nullable: true })
  createdAt: Date;
  @Column({ nullable: true })
  updatedAt: Date;
  @OneToMany(() => Chat, (chat) => chat.room)
  chats: Chat[];
}

@Entity('chat_room_view')
export class ChatRoomView {
  @PrimaryGeneratedColumn()
  id: number;
  @Column()
  roomId: number;
  @Column()
  userId: number;
  @Column()
  title: string;
  @Column()
  isBlock: boolean;
  @Column()
  lastRead: number;
  @Column({ nullable: true })
  createdAt: Date;
  @Column({ nullable: true })
  updatedAt: Date;
  @OneToOne(() => ChatRoom)
  @JoinColumn({ name: 'roomId' })
  room: ChatRoom;
}
