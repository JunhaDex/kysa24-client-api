import { DTOKeys } from '@/types/index.type';

export const UserUpdateDTOKeys: DTOKeys = {
  profileImg: {
    type: 'string',
    required: false,
  },
  coverImg: {
    type: 'string',
    required: false,
  },
  introduce: {
    type: 'string',
    required: false,
  },
} as const;

export const UserPasswordDTOKeys: DTOKeys = {
  oldPwd: {
    type: 'string',
    required: true,
  },
  newPwd: {
    type: 'string',
    required: true,
  },
};

export interface UserPasswordDto {
  oldPwd: string;
  newPwd: string;
}

export interface UserDto {
  name: string;
  sex: 'm' | 'f';
  nickname: string;
  id: string;
  pwd: string;
  teamName: string;
  profileImg?: string;
  coverImg?: string;
  introduce?: string;
  dob: Date;
  geo: string;
}

export const LoginDTOKeys: DTOKeys = {
  id: {
    type: 'string',
    required: true,
  },
  pwd: {
    type: 'string',
    required: true,
  },
} as const;

export interface LoginDto {
  id: string;
  pwd: string;
  fcm?: {
    token: string;
    device: string;
  };
}
