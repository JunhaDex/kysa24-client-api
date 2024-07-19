import {
  CanActivate,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '@/resources/user/user.service';

@Injectable()
export class AuthOptGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const token = (req.headers['authorization']?.split(' ') ?? [])[1];
    req['user'] = undefined;
    if (token) {
      try {
        const user = await this.jwtService.verifyAsync(token);
        if (user) {
          const ref = user.sub;
          const current = await this.userService.getUserInfo(ref);
          if (current) {
            req['user'] = current.myInfo;
            return true;
          }
        }
      } catch (e) {
        Logger.error(e.message);
        if (e.message.includes('jwt expired')) {
          throw new UnauthorizedException();
        }
        throw new InternalServerErrorException();
      }
    }
    return true;
  }
}
