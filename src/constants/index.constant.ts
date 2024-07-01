import { Paginate } from '@/types/index.type';

export const DEFAULT_PAGE_SIZE = 20;
export const DEFAULT_TICKET_COUNT = 10;
export const DEFAULT_MAX_DEVICE_SAVE = 3;
export const EMPTY_PAGE: Paginate<unknown> = {
  meta: {
    pageNo: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    totalPage: 0,
    totalCount: 0,
  },
  list: [],
};

export const RESPONSE_HEADER_RAW = {
  'content-type': 'application/json',
  charset: 'utf-8',
  connection: 'keep-alive',
  'keep-alive': 'timeout=72',
} as const;
