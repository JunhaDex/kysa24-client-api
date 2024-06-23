import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import { UserService } from '@/resources/user/user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('secure-list')
  async listUsers(@Query() query: any, @Res() res: any) {
    return 'listUsers';
  }

  @Patch('my/:id')
  async updateMyInfo(
    @Param('id') id: string,
    @Body() body: any,
    @Res() res: any,
  ) {
    return 'updateMyInfo';
  }

  @Put('my/:id/pwd')
  async updateMyPwd(
    @Param('id') id: string,
    @Body() body: any,
    @Res() res: any,
  ) {
    return 'updateMyPwd';
  }

  @Get('my/noti')
  async listMyNotifications(@Query() query: any, @Res() res: any) {
    return 'listMyNotifications';
  }

  @Delete('my/noti/delete-batch')
  async deleteMyNotificationBatch(@Body() body: any, @Res() res: any) {
    return 'deleteMyNotificationBatch';
  }
}
