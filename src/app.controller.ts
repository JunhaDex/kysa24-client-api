import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { AppService } from './app.service';
import { formatResponse } from '@/utils/index.util';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('healthz')
  getHello(@Res() res: any): string {
    return res
      .status(HttpStatus.OK)
      .send(formatResponse(HttpStatus.OK, 'healthy!'));
  }

  @Get('team')
  async listTeams(@Res() res: any) {
    const teams = await this.appService.listTeams();
    return res.status(HttpStatus.OK).send(formatResponse(HttpStatus.OK, teams));
  }
}
