import { Module } from '@nestjs/common';
import { GroupTaskService } from '@/tasks/group.task';

@Module({
  providers: [GroupTaskService],
})
export class TaskModule {}
