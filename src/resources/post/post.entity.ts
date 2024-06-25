import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
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
  @OneToOne(() => User)
  @JoinColumn({ name: 'author' })
  authorUser: User;
  @ManyToOne(() => Group, (group) => group.posts)
  @JoinColumn({ name: 'group_id' })
  group: Group;
  @OneToMany(() => PostComment, (comment) => comment.post)
  comments: PostComment[];
  @OneToMany(() => PostLike, (like) => like.post)
  likes: PostLike[];
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
  @ManyToOne(() => Post, (post) => post.comments)
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
  @ManyToOne(() => Post, (post) => post.likes)
  @JoinColumn({ name: 'post_id' })
  post: Post;
}
