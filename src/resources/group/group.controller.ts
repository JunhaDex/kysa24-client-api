import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import { GroupService } from './group.service';

@Controller('group')
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @Get()
  async listGroups(@Query() query: any, @Res() res: any) {
    return 'listGroups'; // TODO: Personalize and Generalize
  }

  @Get('feed/:gid')
  async getGroupFeed(
    @Param() gid: string,
    @Query() query: any,
    @Res() res: any,
  ) {
    return 'getGroupFeed';
  }

  @Post('new')
  async createGroup(@Body() body: any, @Res() res: any) {
    return 'createGroup';
  }

  @Put('follow/:gid')
  async followGroup(@Param() gid: string, @Res() res: any) {
    return 'followGroup';
  }

  @Patch(':gid')
  async updateGroupInfo(
    @Param() gid: string,
    @Body() body: any,
    @Res() res: any,
  ) {
    return 'updateGroupInfo';
  }
}
