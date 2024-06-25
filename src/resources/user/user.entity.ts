import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Team } from '@/resources/user/team.entity';

@Entity({ name: 'user' })
export class User {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({ unique: true })
  ref: string;
  @Column()
  name: string;
  @Column({ type: 'tinyint', unsigned: true })
  sex: number; // iso 5218 1: male 2: female
  @Column()
  age: number;
  @Column()
  dob: Date;
  @Column()
  nickname: string;
  @Column({ unique: true })
  authId: string;
  @Column()
  pwd: string;
  @Column()
  teamId: number;
  @Column()
  profileImg: string;
  @Column()
  coverImg: string;
  @Column()
  introduce: string;
  @Column()
  geo: string;
  @Column({})
  actStatus: number;
  @Column({ nullable: true })
  createdAt: Date;
  @Column({ nullable: true })
  updatedAt: Date;
  @OneToOne(() => Team)
  @JoinColumn({ name: 'team_id' })
  team: Team;
}

@Entity({ name: 'user_device' })
export class UserDevice {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({ name: 'user_id' })
  userId: number;
  @Column()
  fcm: string;
  @Column()
  device: string;
  @Column({ nullable: true })
  lastLogin: Date;
  @Column({ nullable: true })
  createdAt: Date;
  @Column({ nullable: true })
  updatedAt: Date;
}

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

@Entity({ name: 'status_user_act' })
export class StatusUserAct {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({ unsigned: true, unique: true })
  level: number;
  @Column()
  statusName: string;
  @Column()
  statusDesc: string;
}
