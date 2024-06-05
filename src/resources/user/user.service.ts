import * as bcrypt from 'bcrypt';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { LoginInput } from '@/resources/user/user.type';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class UserService {
  constructor(private jwtService: JwtService) {}

  async login(cred: LoginInput): Promise<{ accessToken: string }> {
    const user: any = undefined; // find member here
    const bPfx = `$2b$${process.env.BCRYPT_SALT_ROUND}$`;
    if (user) {
      if (await bcrypt.compare(cred.pwd, bPfx + user.pwd)) {
        const payload = { userId: user.userId, sub: user.ref };
        return { accessToken: await this.jwtService.signAsync(payload) };
      }
    }
    throw new ForbiddenException();
  }

  async getMyInfo() {
    return 'getMyInfo';
  }
}
