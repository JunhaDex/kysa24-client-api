import { DTOKeys } from '@/types/index.type';

export const GroupCreateDtoKeys: DTOKeys = {
  groupName: {
    type: 'string',
    required: true,
  },
  introduce: {
    type: 'string',
    required: true,
  },
  profileImg: {
    type: 'string',
    required: false,
  },
  coverImg: {
    type: 'string',
    required: false,
  },
};

export interface GroupCreateDto {
  creator: number;
  groupName: string;
  introduce: string;
  profileImg?: string;
  coverImg?: string;
}

export const GroupUpdateDtoKeys: DTOKeys = {
  introduce: {
    type: 'string',
    required: true,
  },
  profileImg: {
    type: 'string',
    required: false,
  },
  coverImg: {
    type: 'string',
    required: false,
  },
};

export interface GroupUpdateDto {
  introduce: string;
  profileImg?: string;
  coverImg?: string;
}
