import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
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
  UserPasswordDto,
  UserPasswordDTOKeys,
  UserUpdateDTOKeys,
} from '@/resources/user/user.type';
import { DEFAULT_PAGE_SIZE } from '@/constants/index.constant';

@Controller('user')
@UseGuards(AuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * List all users (must login)
   * @param query
   * - page: page number
   * - size: page size
   * - name: username search (FTS)
   * - team-name: team name search (FTS)
   * @param res
   * fastify response
   */
  @Get('secure-list')
  async listUsers(@Query() query: any, @Res() res: any) {
    let page: PageQuery;
    if (query.page || query.size) {
      page = {
        pageNo: Number(query.page ?? 1),
        pageSize: Number(query.size ?? DEFAULT_PAGE_SIZE),
      };
    }
    const list = await this.userService.listUsers({
      page,
      filter: cleanFilter(query, ['name', 'team-name', 'sex']),
    });
    return res.code(HttpStatus.OK).send(formatResponse(HttpStatus.OK, list));
  }

  @Get('team')
  async listTeams(@Res() res: any) {
    const teams = await this.userService.listTeams();
    return res.status(HttpStatus.OK).send(formatResponse(HttpStatus.OK, teams));
  }

  @Get(':ref')
  async getUser(@Param('ref') ref: string, @Res() res: any) {
    try {
      const user = await this.userService.getUserWithExtra(ref);
      return res.code(HttpStatus.OK).send(formatResponse(HttpStatus.OK, user));
    } catch (e) {
      if (e.message === UserService.USER_SERVICE_EXCEPTIONS.USER_NOT_FOUND) {
        return res
          .code(HttpStatus.NOT_FOUND)
          .send(formatResponse(HttpStatus.NOT_FOUND, 'user not found'));
      }
      return fallbackCatch(e, res);
    }
  }

  /**
   * Update user info
   * @param ref
   * user ref uuidv4
   * @param body
   * - profileImg: user profile image url
   * - coverImg: user cover image url
   * - introduce: user introduce 100 words
   * @param req
   * fastify request `['user']`
   * @param res
   * fastify response
   */
  @Patch('my/:ref')
  async updateMyInfo(
    @Param('ref') ref: string,
    @Body() body: UserDto,
    @Req() req: any,
    @Res() res: any,
  ) {
    const userRef = req['user'].ref;
    if (userRef === ref) {
      if (validateBody(UserUpdateDTOKeys, body)) {
        try {
          await this.userService.updateMyInfo(ref, body);
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

  @Patch('my/extra/:ref')
  async updateMyExtra(
    @Param('ref') ref: string,
    @Body() body: any,
    @Req() req: any,
    @Res() res: any,
  ) {
    const userRef = req['user'].ref;
    if (userRef === ref) {
      try {
        await this.userService.updateMyExtra(ref, body);
        return res
          .code(HttpStatus.OK)
          .send(formatResponse(HttpStatus.OK, 'ok'));
      } catch (e) {
        return fallbackCatch(e, res);
      }
    }
    return res
      .code(HttpStatus.FORBIDDEN)
      .send(formatResponse(HttpStatus.FORBIDDEN, 'invalid request'));
  }

  /**
   * Update user password
   * @param id
   * @param body
   * @param req
   * @param res
   */
  @Put('my/:id/pwd')
  async updateMyPwd(
    @Param('id') id: string,
    @Body() body: UserPasswordDto,
    @Req() req: any,
    @Res() res: any,
  ) {
    const userRef = req['user'].ref;
    if (userRef === id) {
      if (validateBody(UserPasswordDTOKeys, body)) {
        try {
          await this.userService.updateMyPwd(id, body);
          return res
            .code(HttpStatus.OK)
            .send(formatResponse(HttpStatus.OK, 'ok'));
        } catch (e) {
          if (
            e.message ===
            UserService.USER_SERVICE_EXCEPTIONS.PASSWORD_NOT_UPDATED
          ) {
            return res
              .code(HttpStatus.FORBIDDEN)
              .send(
                formatResponse(HttpStatus.FORBIDDEN, 'password not updated'),
              );
          }
          return fallbackCatch(e, res);
        }
      }
    }
    return res
      .code(HttpStatus.FORBIDDEN)
      .send(formatResponse(HttpStatus.FORBIDDEN, 'invalid request'));
  }

  /**
   * TODO: Check later with noti service implemented
   */
  @Get('my/noti')
  async listMyNotifications(
    @Query() query: any,
    @Req() req: any,
    @Res() res: any,
  ) {
    const userId = req['user'].id;
    let page: PageQuery;
    if (query.page || query.size) {
      page = {
        pageNo: query.page ?? 1,
        pageSize: query.size ?? 10,
      };
    }
    try {
      const list = await this.userService.listMyNotifications(userId, {
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

  @Post('my/noti')
  async markNotiAsRead(@Body() body: any, @Req() req: any, @Res() res: any) {
    if (validateBody({ ids: { type: 'array', required: true } }, body)) {
      const userId = req['user'].id;
      try {
        await this.userService.markNotiAsRead(userId, body.ids);
        return res
          .code(HttpStatus.OK)
          .send(formatResponse(HttpStatus.OK, 'ok'));
      } catch (e) {
        if (e.message === UserService.USER_SERVICE_EXCEPTIONS.USER_NOT_FOUND) {
          return res
            .code(HttpStatus.NOT_FOUND)
            .send(formatResponse(HttpStatus.NOT_FOUND, 'user not found'));
        }
        return fallbackCatch(e, res);
      }
    }
    return res
      .code(HttpStatus.BAD_REQUEST)
      .send(formatResponse(HttpStatus.BAD_REQUEST, 'invalid request'));
  }

  @Delete('my/noti/delete-batch')
  async deleteMyNotificationBatch(
    @Body() body: any,
    @Req() req: any,
    @Res() res: any,
  ) {
    const userId = req['user'].id;
    if (validateBody({ ids: { type: 'array', required: true } }, body)) {
      try {
        await this.userService.deleteMyNotificationBatch(userId, body.ids);
        return res
          .code(HttpStatus.OK)
          .send(formatResponse(HttpStatus.OK, 'ok'));
      } catch (e) {
        if (e.message === UserService.USER_SERVICE_EXCEPTIONS.USER_NOT_FOUND) {
          return res
            .code(HttpStatus.NOT_FOUND)
            .send(formatResponse(HttpStatus.NOT_FOUND, 'user not found'));
        }
        return fallbackCatch(e, res);
      }
    }
    return res
      .code(HttpStatus.BAD_REQUEST)
      .send(formatResponse(HttpStatus.BAD_REQUEST, 'invalid request'));
  }
}
