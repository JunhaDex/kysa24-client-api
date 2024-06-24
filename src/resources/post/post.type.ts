import { DTOKeys } from '@/types/index.type';

export const PostCreateDTOKeys: DTOKeys = {
  author: {
    type: 'number',
    required: true,
  },
  image: {
    type: 'string',
    required: false,
  },
  message: {
    type: 'string',
    required: true,
  },
  groupRef: {
    type: 'string',
    required: true,
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
  author: {
    type: 'number',
    required: true,
  },
  message: {
    type: 'string',
    required: true,
  },
};

export interface PostCommentCreateDto {
  author: number;
  message: string;
}
