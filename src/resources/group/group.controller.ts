import {
  Body,
  Controller,
  Delete,
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
import { DEFAULT_PAGE_SIZE } from '@/constants/index.constant';

@Controller('group')
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  /**
   * [**Public**]
   *
   * List all groups
   * @param query
   * - page: page number
   * - size: page size
   * - name: group name search (FTS)
   * @param res
   * fastify response
   */
  @Get()
  async listGroups(@Query() query: any, @Res() res: any) {
    let page: PageQuery;
    if (query.page || query.size) {
      page = {
        pageNo: query.page ?? 1,
        pageSize: query.size ?? DEFAULT_PAGE_SIZE,
      };
    }
    const list = await this.groupService.listGroups({
      page,
      filter: { groupName: query.name },
    });
    return res.status(HttpStatus.OK).send(formatResponse(HttpStatus.OK, list));
  }

  /**
   * Create a new group
   * @param body
   * - groupName: string
   * - introduce: string
   * - profileImg: image url
   * - coverImg: image url
   * @param req
   * fastify request
   * @param res
   * fastify response
   */
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
        return res
          .status(HttpStatus.CREATED)
          .send(formatResponse(HttpStatus.CREATED, 'group created'));
      } catch (e) {
        if (e.message === GroupService.GROUP_SERVICE_EXCEPTIONS.GROUP_EXISTS) {
          return res
            .status(HttpStatus.CONFLICT)
            .send(formatResponse(HttpStatus.CONFLICT, 'group already exists'));
        }
        return fallbackCatch(e, res);
      }
    }
    return res
      .status(HttpStatus.FORBIDDEN)
      .send(formatResponse(HttpStatus.FORBIDDEN, 'invalid request'));
  }

  /**
   * Update group information
   * @param gRef
   * group reference uuidv4
   * @param body
   * - introduce: string
   * - profileImg: image url
   * - coverImg: image url
   * @param req
   * fastify request
   * @param res
   * fastify response
   */
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
        return res
          .status(HttpStatus.OK)
          .send(formatResponse(HttpStatus.OK, 'group updated'));
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
        fallbackCatch(e, res);
      }
    }
    return res
      .status(HttpStatus.FORBIDDEN)
      .send(formatResponse(HttpStatus.FORBIDDEN, 'invalid request'));
  }

  /**
   * Follow a group
   * @param gRef
   * group reference uuidv4
   * @param req
   * fastify request
   * @param res
   * fastify response
   */
  @Put('follow/:gRef')
  @UseGuards(AuthGuard)
  async followGroup(
    @Param('gRef') gRef: string,
    @Req() req: any,
    @Res() res: any,
  ) {
    const follower = req['user'].id;
    try {
      await this.groupService.followGroup(gRef, follower);
      return res
        .status(HttpStatus.OK)
        .send(formatResponse(HttpStatus.OK, 'group followed'));
    } catch (e) {
      if (e.message === GroupService.GROUP_SERVICE_EXCEPTIONS.GROUP_NOT_FOUND) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .send(formatResponse(HttpStatus.NOT_FOUND, 'group not found'));
      } else if (e.message.includes('Duplicate entry')) {
        return res
          .status(HttpStatus.CONFLICT)
          .send(formatResponse(HttpStatus.CONFLICT, 'group already followed'));
      }
      return fallbackCatch(e, res);
    }
  }

  @Delete(':gRef')
  @UseGuards(AuthGuard)
  async deleteGroup(
    @Param('gRef') gRef: string,
    @Req() req: any,
    @Res() res: any,
  ) {
    const creator = req['user'].id;
    try {
      await this.groupService.deleteGroup(creator, gRef);
      return res
        .status(HttpStatus.OK)
        .send(formatResponse(HttpStatus.OK, 'group deleted'));
    } catch (e) {
      if (e.message === GroupService.GROUP_SERVICE_EXCEPTIONS.GROUP_NOT_FOUND) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .send(formatResponse(HttpStatus.NOT_FOUND, 'group not found'));
      } else if (
        e.message === GroupService.GROUP_SERVICE_EXCEPTIONS.GROUP_UNAUTHORIZED
      ) {
        return res
          .status(HttpStatus.FORBIDDEN)
          .send(
            formatResponse(HttpStatus.FORBIDDEN, 'group delete unauthorized'),
          );
      }
      return fallbackCatch(e, res);
    }
  }
}
