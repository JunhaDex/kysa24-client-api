import * as bcrypt from 'bcrypt';
import { Injectable } from '@nestjs/common';
import { LoginDto, UserDto, UserPasswordDto } from '@/resources/user/user.type';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThanOrEqual, Like, Repository } from 'typeorm';
import { User, UserDevice, UserExtra } from '@/resources/user/user.entity';
import { Notification } from '@/resources/noti/noti.entity';
import { Team } from '@/resources/user/team.entity';
import { flattenObject } from '@/utils/index.util';
import { PageQuery, Paginate } from '@/types/index.type';
import {
  DEFAULT_MAX_DEVICE_SAVE,
  DEFAULT_PAGE_SIZE,
  EMPTY_PAGE,
} from '@/constants/index.constant';

@Injectable()
export class UserService {
  static USER_SERVICE_EXCEPTIONS = {
    USER_NOT_FOUND: 'USER_NOT_FOUND',
    PASSWORD_NOT_UPDATED: 'PASSWORD_NOT_UPDATED',
  } as const;

  private readonly Exceptions = UserService.USER_SERVICE_EXCEPTIONS;

  constructor(
    private jwtService: JwtService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Team) private readonly teamRepo: Repository<Team>,
    @InjectRepository(UserDevice)
    private readonly deviceRepo: Repository<UserDevice>,
    @InjectRepository(UserExtra)
    private readonly extraRepo: Repository<UserExtra>,
    @InjectRepository(Notification)
    private readonly notiRepo: Repository<Notification>,
  ) {}

  private safeUserInfo(user: User): User {
    return flattenObject(user, {
      exclude: [
        'pwd',
        'team.id',
        'team.leader',
        'team.createdAt',
        'team.updatedAt',
      ],
      alias: {
        'team.teamName': 'teamName',
      },
    }) as User;
  }

  async login(
    cred: LoginDto,
  ): Promise<{ accessToken: string; isRegister: boolean }> {
    const user: any = await this.userRepo.findOneBy({ authId: cred.id });
    if (user) {
      if (await bcrypt.compare(cred.pwd, user.pwd)) {
        const payload = { userId: user.userId, name: user.name, sub: user.ref };
        const accessToken = await this.jwtService.signAsync(payload, {
          expiresIn: '3d',
        });
        let isRegister = false;
        if (cred.fcm) {
          isRegister = await this.pushUserDevice(user.id, cred.fcm);
        }
        return { accessToken, isRegister };
      }
    }
    throw new Error(this.Exceptions.USER_NOT_FOUND);
  }

  async pushUserDevice(
    userId: number,
    data: { token: string; device: string },
  ): Promise<boolean> {
    // check if device already exists
    const exist = await this.deviceRepo.findOneBy({ fcm: data.token });
    if (!exist) {
      const devices = await this.deviceRepo.find({
        where: { userId },
        order: { lastLogin: 'ASC' },
      });
      // delete same device renewed token
      const sameDevice = devices.find((d) => d.device === data.device);
      if (sameDevice) {
        await this.deviceRepo.delete(sameDevice);
      }
      // delete old device (save up to 3)
      if (devices.length >= DEFAULT_MAX_DEVICE_SAVE) {
        await this.deviceRepo.delete(devices[0]);
      }
      const device = this.deviceRepo.create({
        userId,
        fcm: data.token,
        device: data.device,
        lastLogin: new Date(),
      });
      await this.deviceRepo.save(device);
      return true;
    }
    return false;
  }

  async getMyInfo(userRef: string) {
    const user: any = await this.userRepo.findOneBy({ ref: userRef });
    if (user) {
      const my = this.safeUserInfo(user);
      return { myInfo: my };
    }
    throw new Error(this.Exceptions.USER_NOT_FOUND);
  }

  async getUserWithExtra(userRef: string): Promise<{ user: User; extra: any }> {
    const user: any = await this.userRepo.findOneBy({ ref: userRef });
    if (user) {
      const cleanUser = this.safeUserInfo(user);
      const extra = await this.extraRepo.findOneBy({ userId: user.id });
      return { user: cleanUser, extra: extra.extraInfo };
    }
    throw new Error(this.Exceptions.USER_NOT_FOUND);
  }

  async getUserInfoById(userIds: number[]) {
    const users = await this.userRepo.find({
      where: { id: In(userIds) },
    });
    return users.map((user) => {
      return this.safeUserInfo(user);
    });
  }

  async listUsers(options?: {
    page?: PageQuery;
    filter?: { name?: string; teamName?: string; sex?: string };
  }): Promise<Paginate<User>> {
    // setup page query: page -> teamId, pageSize -> ignore, pageStart -> ignore
    const pageNo = options?.page?.pageNo ?? 1;
    const totalUsers = await this.userRepo.count();
    let totalTeams = await this.teamRepo.count();
    let filter: any = {
      teamId: pageNo,
    };
    if (options?.filter) {
      if (options.filter.name) {
        filter = { name: Like(`%${options.filter.name}%`) };
      }
      if (options.filter.teamName) {
        totalTeams = 1;
        const [teams, tCount] = await this.teamRepo.findAndCountBy({
          teamName: Like(`%${options.filter.teamName}%`),
        });
        if (tCount > 0) {
          totalTeams = 1;
          filter = {
            teamId: In(teams.map((team) => team.id)),
          };
        } else {
          return EMPTY_PAGE as Paginate<User>;
        }
      }
      if (options.filter.sex) {
        const iso =
          Number(options.filter.sex) === 1
            ? 1
            : Number(options.filter.sex) === 2
              ? 2
              : undefined;
        filter = { ...filter, sex: iso };
      }
    }
    // query user table
    const [listRaw, count] = await this.userRepo.findAndCount({
      where: filter,
      relations: ['team'],
    });
    const list = listRaw.map((user) => {
      return this.safeUserInfo(user);
    });
    // return paginated result
    return {
      meta: {
        pageNo: options?.page?.pageNo ?? 1,
        pageSize: DEFAULT_PAGE_SIZE,
        totalPage: totalTeams,
        totalCount: options?.filter ? count : totalUsers,
      },
      list,
    };
  }

  async listTeams(): Promise<Team[]> {
    return await this.teamRepo.find({
      select: ['id', 'teamName'],
      order: { id: 'ASC' },
    });
  }

  async updateMyInfo(userRef: string, data: UserDto): Promise<void> {
    const user: any = await this.userRepo.findOneBy({ ref: userRef });
    if (user) {
      user.profileImg = data.profileImg;
      user.coverImg = data.coverImg;
      user.introduce = data.introduce;
      user.geo = data.geo;
      await this.userRepo.save(user);
      return;
    }
    throw new Error(this.Exceptions.USER_NOT_FOUND);
  }

  async updateMyExtra(userRef: string, data: any): Promise<void> {
    const user: any = await this.userRepo.findOneBy({ ref: userRef });
    if (user) {
      const extra = await this.extraRepo.findOneBy({ userId: user.id });
      if (extra) {
        extra.extraInfo = data;
        await this.extraRepo.save(extra);
        return;
      }
      throw new Error(this.Exceptions.USER_NOT_FOUND);
    }
  }

  async updateMyPwd(userRef: string, data: UserPasswordDto): Promise<void> {
    const user: any = await this.userRepo.findOneBy({ ref: userRef });
    if (user) {
      if (await bcrypt.compare(data.oldPwd, user.pwd)) {
        // hash password
        const round = Number(process.env.BCRYPT_SALT_ROUND);
        const salt = await bcrypt.genSalt(round);
        user.pwd = await bcrypt.hash(data.newPwd, salt);
        await this.userRepo.save(user);
        return;
      }
      throw new Error(this.Exceptions.PASSWORD_NOT_UPDATED);
    }
    throw new Error(this.Exceptions.USER_NOT_FOUND);
  }

  async listMyNotifications(
    id: number,
    options?: { page: PageQuery },
  ): Promise<Paginate<Notification>> {
    const user = await this.userRepo.findOneBy({ id });
    if (user) {
      // setup page query
      const size = options?.page ? options.page.pageSize : DEFAULT_PAGE_SIZE;
      const skip = options?.page
        ? (options.page.pageNo - 1) * options.page.pageSize
        : 0;
      const take = options?.page ? options.page.pageSize : size;
      const start = options?.page ? options.page.pageStart : undefined;
      // query notification table
      const [list, count] = await this.notiRepo.findAndCount({
        where: {
          target: user.id,
          id: start ? LessThanOrEqual(start) : undefined,
        },
        skip,
        take,
        order: { id: 'DESC' },
      });
      return {
        meta: {
          pageNo: options?.page?.pageNo || 1,
          pageSize: size,
          totalPage: Math.ceil(count / size),
          totalCount: count,
        },
        list,
      };
    }
    throw new Error(this.Exceptions.USER_NOT_FOUND);
  }

  async markNotiAsRead(userId: number, notiIds: number[]): Promise<void> {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (user) {
      const now = new Date();
      await this.notiRepo.update(
        { target: user.id, id: In(notiIds) },
        { readAt: now },
      );
      return;
    }
    throw new Error(this.Exceptions.USER_NOT_FOUND);
  }

  async deleteMyNotificationBatch(
    id: number,
    notiIds: number[],
  ): Promise<void> {
    const user = await this.userRepo.findOneBy({ id });
    if (user) {
      const myNoti = await this.notiRepo.find({
        select: ['id'],
        where: { target: user.id, id: In(notiIds) },
      });
      await this.notiRepo.delete(myNoti.map((n) => n.id));
      return;
    }
    throw new Error(this.Exceptions.USER_NOT_FOUND);
  }
}
