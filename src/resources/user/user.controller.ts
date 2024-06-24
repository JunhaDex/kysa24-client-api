import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { UserService } from '@/resources/user/user.service';
import { AuthGuard } from '@/guards/auth.guard';
import { PageQuery } from '@/types/index.type';
import {
  cleanFilter,
  fallbackCatch,
  formatResponse,
  validateBody,
} from '@/utils/index.util';
import {
  UserDto,
  UserPasswordDTOKeys,
  UserUpdateDTOKeys,
} from '@/resources/user/user.type';

@Controller('user')
@UseGuards(AuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('secure-list')
  async listUsers(@Query() query: any, @Res() res: any) {
    let page: PageQuery;
    if (query.page || query.size) {
      page = {
        pageNo: query.page ?? 1,
        pageSize: query.size ?? 10,
      };
    }
    const list = await this.userService.listUsers({
      page,
      filter: cleanFilter(query, ['name', 'team-name']),
    });
    return res.code(HttpStatus.OK).send(formatResponse(HttpStatus.OK, list));
  }

  @Patch('my/:id')
  async updateMyInfo(
    @Param('id') id: string,
    @Body() body: UserDto,
    @Req() req: any,
    @Res() res: any,
  ) {
    const userRef = req['sub'];
    if (userRef === id) {
      if (validateBody(UserUpdateDTOKeys, body)) {
        try {
          await this.userService.updateMyInfo(id, body);
          return res
            .code(HttpStatus.OK)
            .send(formatResponse(HttpStatus.OK, 'ok'));
        } catch (e) {
          return fallbackCatch(e, res);
        }
      }
    }
    return res
      .code(HttpStatus.FORBIDDEN)
      .send(formatResponse(HttpStatus.FORBIDDEN, 'invalid request'));
  }

  @Put('my/:id/pwd')
  async updateMyPwd(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req: any,
    @Res() res: any,
  ) {
    const userRef = req['sub'];
    if (userRef === id) {
      if (validateBody(UserPasswordDTOKeys, body)) {
        try {
          await this.userService.updateMyPwd(id, body.password);
          return res
            .code(HttpStatus.OK)
            .send(formatResponse(HttpStatus.OK, 'ok'));
        } catch (e) {
          return fallbackCatch(e, res);
        }
      }
    }
    return res
      .code(HttpStatus.FORBIDDEN)
      .send(formatResponse(HttpStatus.FORBIDDEN, 'invalid request'));
  }

  @Get('my/noti')
  async listMyNotifications(
    @Query() query: any,
    @Req() req: any,
    @Res() res: any,
  ) {
    const userRef = req['sub'];
    let page: PageQuery;
    if (query.page || query.size) {
      page = {
        pageNo: query.page ?? 1,
        pageSize: query.size ?? 10,
      };
    }
    try {
      const list = await this.userService.listMyNotifications(userRef, {
        page,
      });
      return res.code(HttpStatus.OK).send(formatResponse(HttpStatus.OK, list));
    } catch (e) {
      if (e.message === UserService.USER_SERVICE_EXCEPTIONS.USER_NOT_FOUND) {
        return res
          .code(HttpStatus.NOT_FOUND)
          .send(formatResponse(HttpStatus.NOT_FOUND, 'user not found'));
      }
      return fallbackCatch(e, res);
    }
  }

  @Delete('my/noti/delete-batch')
  async deleteMyNotificationBatch(
    @Body() body: any,
    @Req() req: any,
    @Res() res: any,
  ) {
    const userRef = req['sub'];
    if (validateBody({ ids: { type: 'array', required: true } }, body)) {
      try {
        await this.userService.deleteMyNotificationBatch(userRef, body.ids);
      } catch (e) {
        return fallbackCatch(e, res);
      }
    }
  }
}
