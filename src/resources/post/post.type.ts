import { DTOKeys } from '@/types/index.type';

export const PostCreateDTOKeys: DTOKeys = {
  groupRef: {
    type: 'string',
    required: true,
  },
  message: {
    type: 'string',
    required: true,
  },
  image: {
    type: 'string',
    required: false,
  },
};

export interface PostCreateDto {
  author: number;
  image?: string;
  message: string;
  groupRef: string;
}

export const PostUpdateDTOKeys: DTOKeys = {
  image: {
    type: 'string',
    required: false,
  },
  message: {
    type: 'string',
    required: true,
  },
};

export interface PostUpdateDto {
  image?: string;
  message: string;
}

export const PostCommentCreateDTOKeys: DTOKeys = {
  message: {
    type: 'string',
    required: true,
  },
};

export interface PostCommentCreateDto {
  author: number;
  message: string;
}
