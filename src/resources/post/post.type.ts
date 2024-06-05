import { Group } from '@/resources/group/group.type';
import { User } from '@/resources/user/user.type';

/**
 * type definition for post db model
 */
export interface PostCore {
  author: User | number;
  image: string;
  message: string;
  groupId: Group;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

/**
 * type definition for post response
 */
export interface Post extends PostCore {
  comments: PostComment[];
  likes: number;
}

/**
 * type definition for post comment db model
 */
export interface PostComment {
  author: User | number;
  postId: number;
  message: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}
