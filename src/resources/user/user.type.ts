import { Group } from '@/resources/group/group.type';

/**
 * type definition for user db model - when write
 */
export interface UserDto {
  name: string;
  sex: 'm' | 'f';
  age: number;
  nickname: string;
  id: string;
  pwd: string;
  teamId: number;
  profileImg: string;
  coverImg: string;
  introduce: string;
  dob: Date;
  geo: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface LoginInput {
  id: string;
  pwd: string;
}

/**
 * type definition for user db model - when read
 * id, pwd should be removed
 */
export interface User {
  name: string;
  sex: 'm' | 'f';
  age: number;
  nickname: string;
  team: Team;
  profileImg: string;
  coverImg: string;
  introduce: string;
  geo: string;
  groups: Group[];
  followers: number;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * type definition for team db model
 */
export interface Team {
  teamName: string;
  leader: User;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * type definition for user_device db model
 */
export interface UserDevice {
  userId: number;
  fcm: string;
  device: string;
  lastLogin: Date;
  createdAt?: Date;
  updatedAt?: Date;
}
