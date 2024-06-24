import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '@/resources/user/user.entity';
import { Group } from '@/resources/group/group.entity';

@Entity({ name: 'post' })
export class Post {
  @PrimaryGeneratedColumn()
  id: number;
  @Column()
  author: number;
  @Column({ nullable: true })
  image: string;
  @Column({ type: 'text' })
  message: string;
  @Column()
  groupId: number;
  @Column({ nullable: true })
  createdAt: Date;
  @Column({ nullable: true })
  updatedAt: Date;
  @OneToOne(() => User)
  @JoinColumn({ name: 'author' })
  authorUser: User;
  @OneToOne(() => Group)
  @JoinColumn({ name: 'group_id' })
  group: Group;
}

@Entity({ name: 'post_comment' })
export class PostComment {
  @PrimaryGeneratedColumn()
  id: number;
  @Column()
  author: number;
  @Column()
  postId: number;
  @Column({ type: 'text' })
  message: string;
  @Column({ nullable: true })
  createdAt: Date;
  @Column({ nullable: true })
  updatedAt: Date;
  @Column({ nullable: true })
  deletedAt: Date;
  @OneToOne(() => User)
  @JoinColumn({ name: 'author' })
  authorUser: User;
  @OneToOne(() => Post)
  @JoinColumn({ name: 'post_id' })
  post: Post;
}

@Entity({ name: 'post_like' })
export class PostLike {
  @PrimaryGeneratedColumn()
  id: number;
  @Column()
  author: number;
  @Column()
  postId: number;
  @Column({ nullable: true })
  createdAt: Date;
  @Column({ nullable: true })
  updatedAt: Date;
  @Column({ nullable: true })
  deletedAt: Date;
  // no relations, just count
}
