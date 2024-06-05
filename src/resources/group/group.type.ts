import { User } from '@/resources/user/user.type';

/**
 * type definition for group db model
 */
export interface GroupCore {
  creator: User | number;
  groupName: string;
  profileImg: string;
  coverImg: string;
  introduce: string;
  isShow: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * type definition for group response
 */
export interface Group extends GroupCore {
  followers: number;
  exposure: number;
}
