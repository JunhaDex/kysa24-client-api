import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { AuthController } from './auth.controller';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Notification,
  Team,
  User,
  UserDevice,
} from '@/resources/user/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Team, UserDevice, Notification])],
  controllers: [AuthController, UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
