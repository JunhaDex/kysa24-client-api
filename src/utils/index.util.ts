import { ApiResponse, DTOKeys } from '@/types/index.type';
import { HttpStatus, Logger } from '@nestjs/common';

export function validateBody(keys: DTOKeys, obj: any): boolean {
  for (const key in keys) {
    if (keys[key].required) {
      if (obj[key] === undefined || obj[key] === null || obj[key] === '') {
        return false;
      }
    } else if (!keys[key].required && obj[key] !== undefined) {
      if (typeof keys[key].type === 'string') {
        if (keys[key].type === 'date') {
          if (isNaN(Date.parse(obj[key]))) {
            return false;
          }
        } else if (keys[key].type !== typeof obj[key]) {
          return false;
        }
      } else {
        if (!keys[key].type.includes(obj[key])) {
          return false;
        }
      }
      if (keys[key].length && obj[key].length > keys[key].length) {
        return false;
      }
      if (keys[key].limit && obj[key] > keys[key].limit) {
        return false;
      }
      if (keys[key].include && !keys[key].include.includes(obj[key])) {
        return false;
      }
      if (keys[key].exclude && keys[key].exclude.includes(obj[key])) {
        return false;
      }
    }
  }
  return true;
}

export function flattenObject(
  obj: any,
  options?: {
    include?: string[];
    exclude?: string[]; // ignored when include is provided
    alias?: { [key: string]: string }; // {target: alias}
  },
): unknown {
  const result: any = {};
  const recurse = (cur: any, prop: string) => {
    for (const key in cur) {
      const value = cur[key];
      if (
        value !== null &&
        typeof value === 'object' &&
        value.toString() === '[object Object]' &&
        !Array.isArray(value)
      ) {
        const nextProp = prop ? `${prop}.${key}` : key;
        recurse(value, nextProp);
      } else {
        result[prop ? `${prop}.${key}` : key] = value;
      }
    }
  };
  recurse(obj, '');
  if (options?.include !== undefined) {
    for (const key in result) {
      if (!options.include.includes(key)) {
        delete result[key];
      }
    }
  } else {
    for (const key of options?.exclude || []) {
      delete result[key];
    }
  }
  for (const key in options?.alias || {}) {
    result[options.alias[key]] = result[key];
    delete result[key];
  }
  return result;
}

export function cleanFilter(obj: any, keys: string[]): any {
  const cleaned: any = {};
  for (const key of keys) {
    if (key.includes('-')) {
      // snake to camel
      const camelKey = key.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
      cleaned[camelKey] = obj[key];
    } else {
      cleaned[key] = obj[key];
    }
  }
  return cleaned;
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
  if (code >= 200 && code < 300) {
    message = 'ok';
  } else if (code === 400) {
    message = 'bad request';
  } else if (code === 401) {
    message = 'unauthorized';
  } else if (code === 403) {
    message = 'forbidden';
  } else if (code === 404) {
    message = 'not found';
  } else if (code === 409) {
    message = 'conflict';
  } else if (code === 500) {
    message = 'internal server error';
  }
  return {
    code,
    message,
    result,
  };
}

export function fallbackCatch(e: any, res: any) {
  Logger.error(e);
  return res
    .status(HttpStatus.INTERNAL_SERVER_ERROR)
    .send(
      formatResponse(HttpStatus.INTERNAL_SERVER_ERROR, 'internal server error'),
    );
}

export function checkAuth(
  userLevel: number,
  feature: 'group' | 'chat',
): boolean {
  const AUTH_ALLOW: { [key: string]: number[] } = {
    group: [1, 4],
    chat: [1, 2, 3],
  } as const;
  if (userLevel === 0) {
    return false;
  } else {
    return AUTH_ALLOW[feature].includes(userLevel);
  }
}
