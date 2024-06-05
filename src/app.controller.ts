import { Controller, Get, HttpStatus, Inject, Res } from '@nestjs/common';
import { AppService } from './app.service';
import { formatResponse } from '@/utils/index.util';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

@Controller()
export class AppController {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: any,
    private readonly appService: AppService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('test')
  async test(@Res() res: any): Promise<string> {
    const cached = await this.cacheManager.get('foo');
    return res.code(HttpStatus.OK).send(formatResponse(HttpStatus.OK, cached));
  }
}
