import { HttpStatus, Injectable, NestMiddleware } from '@nestjs/common';
import { formatResponse } from '@/utils/index.util';
import { RESPONSE_HEADER_RAW } from '@/constants/index.constant';

@Injectable()
export class UploadMiddleware implements NestMiddleware {
  constructor() {}

  use(req: any, res: any, next: () => void) {
    if (req.method === 'options') return next();
    const contentType = req.headers['content-type'];
    if (contentType && contentType.includes('multipart/form-data')) {
      return next();
    }
    res.writeHead(HttpStatus.FORBIDDEN, RESPONSE_HEADER_RAW);
    return res.end(
      JSON.stringify(formatResponse(HttpStatus.FORBIDDEN, 'invalid request')),
    );
  }
}
