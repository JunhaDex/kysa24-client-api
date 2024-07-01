import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'noti' })
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;
  @Column()
  target: number;
  @Column()
  type: string; // chat | group | post
  @Column()
  message: string;
  @Column({ nullable: true })
  readAt: Date;
  @Column({ nullable: true })
  createdAt: Date;
  @Column({ nullable: true })
  updatedAt: Date;
}
