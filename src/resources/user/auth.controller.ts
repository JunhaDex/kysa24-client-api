import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { LoginDto, LoginDTOKeys } from '@/resources/user/user.type';
import {
  fallbackCatch,
  formatResponse,
  validateBody,
} from '@/utils/index.util';
import { AuthGuard } from '@/guards/auth.guard';

/**
 * Auth Controller
 * @end-points
 * - POST `api/v1/auth/login` user login
 * - GET `api/v1/auth/my` get my info
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly userService: UserService) {}

  /**
   * [**Public**]
   *
   * User Login
   * @param loginDto
   * - id: user id
   * - password: user password
   * - fcm?: {
   *     token: string,
   *     device: string
   *   }
   * @param res
   * fastify response
   */
  @Post('login')
  async login(@Body() loginDto: LoginDto, @Res() res: any) {
    if (validateBody(LoginDTOKeys, loginDto)) {
      try {
        const data = await this.userService.login(loginDto);
        return res
          .code(HttpStatus.OK)
          .send(formatResponse(HttpStatus.OK, data));
      } catch (e) {
        if (e.message === UserService.USER_SERVICE_EXCEPTIONS.USER_NOT_FOUND) {
          return res
            .code(HttpStatus.FORBIDDEN)
            .send(formatResponse(HttpStatus.FORBIDDEN, 'invalid request'));
        }
        return fallbackCatch(e, res);
      }
    }
    return res
      .code(HttpStatus.FORBIDDEN)
      .send(formatResponse(HttpStatus.FORBIDDEN, 'invalid request'));
  }

  /**
   * my info
   * @param req
   * fastify request
   * @param res
   * fastify response
   */
  @Get('my')
  @UseGuards(AuthGuard)
  async getMyInfo(@Req() req: any, @Res() res: any) {
    const myInfo = req['user'];
    return res.code(HttpStatus.OK).send(formatResponse(HttpStatus.OK, myInfo));
  }
}
