import { Global, Module } from '@nestjs/common';
import { UserService } from './user.service';
import { AuthController } from './auth.controller';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User, UserDevice } from '@/resources/user/user.entity';
import { Team } from '@/resources/user/team.entity';
import { Notification } from '@/resources/noti/noti.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([User, Team, UserDevice, Notification])],
  controllers: [AuthController, UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
