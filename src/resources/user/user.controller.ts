import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import { UserService } from './user.service';
import { LoginInput } from '@/resources/user/user.type';
import { formatResponse, validateObject } from '@/utils/index.util';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('login')
  async login(@Body() cred: LoginInput, @Res() res: any) {
    if (validateObject(['id', 'pwd'], cred)) {
      const token = await this.userService.login(cred);
      return res.code(HttpStatus.OK).send(formatResponse(HttpStatus.OK, token));
    }
    throw new ForbiddenException();
  }

  @Get('my')
  async getMyInfo() {}
}
