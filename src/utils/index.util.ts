import { ApiResponse } from '@/types/index.type';

export function validateObject(keys: string[], obj: any): boolean {
  for (const key of keys as string[]) {
    if (!obj[key]) {
      return false;
    }
  }
  return true;
}

export function safeObject(
  keys: { key: string; type: string }[],
  obj: any,
): unknown {
  const newObj: any = { ...obj };
  for (const { key, type } of keys) {
    if (!obj[key]) {
      if (type === 'string') {
        newObj[key] = '';
      } else if (type === 'number') {
        newObj[key] = 0;
      } else if (type === 'boolean') {
        newObj[key] = false;
      } else if (type === 'array') {
        newObj[key] = [];
      } else if (type === 'object') {
        newObj[key] = {};
      }
    }
  }
  return newObj;
}

export function formatResponse(code: number, result: any): ApiResponse {
  let message = '';
  if (code === 200) {
    message = 'ok';
  } else if (code === 400) {
    message = 'bad request';
  } else if (code === 401) {
    message = 'unauthorized';
  } else if (code === 403) {
    message = 'forbidden';
  } else if (code === 404) {
    message = 'not found';
  } else if (code === 500) {
    message = 'internal server error';
  }
  return {
    code,
    message,
    result,
  };
}
