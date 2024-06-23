import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { AuthController } from './auth.controller';
import { UserController } from './user.controller';

@Module({
  controllers: [AuthController, UserController],
  providers: [UserService],
})
export class UserModule {}
