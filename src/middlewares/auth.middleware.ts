import { HttpStatus, Injectable, NestMiddleware } from '@nestjs/common';
import { formatResponse } from '@/utils/index.util';
import { RESPONSE_HEADER_RAW } from '@/constants/index.constant';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor() {}

  use(req: any, res: any, next: () => void) {
    if (req.method === 'options') return next();
    const [type, token] = req.headers['authorization']?.split(' ') ?? [];
    if (type === 'Bearer' && token) {
      return next();
    }
    res.writeHead(HttpStatus.FORBIDDEN, RESPONSE_HEADER_RAW);
    return res.end(
      JSON.stringify(formatResponse(HttpStatus.FORBIDDEN, 'invalid request')),
    );
  }
}
