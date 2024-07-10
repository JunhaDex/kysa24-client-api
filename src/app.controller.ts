import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { UserService } from '@/resources/user/user.service';
import { formatResponse } from '@/utils/index.util';

@Controller()
export class AppController {
  constructor(private readonly userService: UserService) {}

  @Get('healthz')
  getHello(@Res() res: any): string {
    return res
      .status(HttpStatus.OK)
      .send(formatResponse(HttpStatus.OK, 'healthy!'));
  }

  @Get('team')
  async listTeams(@Res() res: any) {
    const teams = await this.userService.listTeams();
    return res.status(HttpStatus.OK).send(formatResponse(HttpStatus.OK, teams));
  }
}
