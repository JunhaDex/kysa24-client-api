import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '@/resources/user/user.entity';

@Entity({ name: 'team' })
export class Team {
  @PrimaryGeneratedColumn()
  id: number;
  @Column()
  teamName: string;
  @Column({ nullable: true })
  leader: number;
  @Column({ nullable: true })
  createdAt: Date;
  @Column({ nullable: true })
  updatedAt: Date;
  @OneToOne(() => User)
  @JoinColumn({ name: 'leader' })
  leaderUser: User;
}
