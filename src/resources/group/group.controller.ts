import {
  Body,
  Controller,
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
import { GroupService } from './group.service';
import { PageQuery } from '@/types/index.type';
import {
  fallbackCatch,
  formatResponse,
  validateBody,
} from '@/utils/index.util';
import { AuthGuard } from '@/guards/auth.guard';
import {
  GroupCreateDto,
  GroupCreateDtoKeys,
  GroupUpdateDto,
  GroupUpdateDtoKeys,
} from '@/resources/group/group.type';

@Controller('group')
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @Get()
  async listGroups(@Query() query: any, @Res() res: any) {
    let page: PageQuery;
    if (query.page || query.size) {
      page = {
        pageNo: query.page ?? 1,
        pageSize: query.size ?? 10,
      };
    }
    const list = await this.groupService.listGroups({
      page,
      filter: { groupName: query.name },
    });
    return res.status(HttpStatus.OK).send(formatResponse(HttpStatus.OK, list));
  }

  @Post('new')
  @UseGuards(AuthGuard)
  async createGroup(
    @Body() body: GroupCreateDto,
    @Req() req: any,
    @Res() res: any,
  ) {
    if (validateBody(GroupCreateDtoKeys, body)) {
      body.creator = req['user'].id;
      try {
        await this.groupService.createGroup(body);
      } catch (e) {
        if (e.message === GroupService.GROUP_SERVICE_EXCEPTIONS.GROUP_EXISTS) {
          return res
            .status(HttpStatus.CONFLICT)
            .send(formatResponse(HttpStatus.CONFLICT, 'group already exists'));
        }
        fallbackCatch(res, e);
      }
    }
  }

  @Patch(':gRef')
  @UseGuards(AuthGuard)
  async updateGroupInfo(
    @Param('gRef') gRef: string,
    @Body() body: GroupUpdateDto,
    @Req() req: any,
    @Res() res: any,
  ) {
    if (validateBody(GroupUpdateDtoKeys, body)) {
      const creator = req['user'].id;
      try {
        await this.groupService.updateGroup(creator, gRef, body);
      } catch (e) {
        if (
          e.message === GroupService.GROUP_SERVICE_EXCEPTIONS.GROUP_NOT_FOUND
        ) {
          return res
            .status(HttpStatus.NOT_FOUND)
            .send(formatResponse(HttpStatus.NOT_FOUND, 'group not found'));
        } else if (
          e.message === GroupService.GROUP_SERVICE_EXCEPTIONS.GROUP_UNAUTHORIZED
        ) {
          return res
            .status(HttpStatus.FORBIDDEN)
            .send(
              formatResponse(HttpStatus.FORBIDDEN, 'group update unauthorized'),
            );
        }
        fallbackCatch(res, e);
      }
    }
  }

  @Put('follow/:gRef')
  async followGroup(
    @Param('gRef') gRef: string,
    @Req() req: any,
    @Res() res: any,
  ) {
    const follower = req['user'].id;
    try {
      await this.groupService.followGroup(gRef, follower);
    } catch (e) {
      if (e.message === GroupService.GROUP_SERVICE_EXCEPTIONS.GROUP_NOT_FOUND) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .send(formatResponse(HttpStatus.NOT_FOUND, 'group not found'));
      }
      fallbackCatch(res, e);
    }
  }
}
