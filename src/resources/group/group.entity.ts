import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '@/resources/user/user.entity';

@Entity({ name: 'group' })
export class Group {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({ unique: true })
  ref: string;
  @Column()
  creator: number;
  @Column()
  groupName: string;
  @Column({ nullable: true })
  profileImg: string;
  @Column({ nullable: true })
  coverImg: string;
  @Column({ nullable: true })
  introduce: string;
  @Column({ type: 'tinyint', unsigned: true })
  isShow: boolean; // 0: hide, 1: show
  @Column({ nullable: true })
  createdAt: Date;
  @Column({ nullable: true })
  updatedAt: Date;
  @OneToOne(() => User)
  @JoinColumn({ name: 'creator' })
  creatorUser: User;
}

@Entity({ name: 'group_user_follow' })
export class GroupUserFollow {
  @PrimaryGeneratedColumn()
  id: number;
  @Column()
  groupId: number;
  @Column()
  follower: number;
  @Column({ type: 'tinyint', unsigned: true })
  isMust: boolean; // 0: default 1: must (cannot be unfollowed)
  @Column()
  role: string; // default writer, reader | writer
  @Column({ nullable: true })
  createdAt: Date;
  @Column({ nullable: true })
  updatedAt: Date;
}
