export interface ApiResponse {
  code: number;
  message: string;
  result: any;
}

export interface PageMeta {
  pageNo: number;
  pageSize: number;
  totalCount: number;
  totalPage: number;
}

export interface Paginate<T> {
  meta: PageMeta;
  list: T[];
}
