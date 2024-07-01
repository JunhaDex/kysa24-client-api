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

export interface PageQuery {
  pageNo: number;
  pageSize?: number;
  pageStart?: number;
}

export interface DTOKeys {
  [key: string]: {
    type: string | Array<string>;
    required: boolean;
    length?: number;
    limit?: number;
    include?: string[];
    exclude?: string[];
  };
}
