import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { UserService } from '@/resources/user/user.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const token = (req.headers['authorization']?.split(' ') ?? [])[1];
    try {
      const user = await this.jwtService.verifyAsync(token);
      if (user) {
        const ref = user.sub;
        const current = this.userService.getUserInfo(ref);
        if (current) {
          req['user'] = current;
          return true;
        }
      }
    } catch (e) {
      Logger.error(e.message);
    }
    throw new UnauthorizedException();
  }
}
