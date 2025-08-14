import { Cron, CronExpression } from '@nestjs/schedule';
import { Injectable, Logger } from '@nestjs/common';
import { GroupService } from '@/resources/group/group.service';

@Injectable()
export class GroupTaskService {
  constructor(private readonly groupService: GroupService) {}

  // @Cron(CronExpression.EVERY_5_MINUTES)
  // async handleCron() {
  //   Logger.log('Updating group priority...');
  //   await this.groupService.updateGroupPriority();
  // }
}
