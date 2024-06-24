import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Group, GroupUserFollow } from '@/resources/group/group.entity';

@Injectable()
export class GroupService {
  constructor(
    @InjectRepository(Group) private readonly groupRepo: Group,
    @InjectRepository(GroupUserFollow)
    private readonly followRepo: GroupUserFollow,
  ) {}
}
