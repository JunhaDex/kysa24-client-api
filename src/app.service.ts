import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Team } from '@/resources/user/team.entity';
import { Repository } from 'typeorm';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(Team) private readonly teamRepo: Repository<Team>,
  ) {}

  async listTeams(): Promise<Team[]> {
    return await this.teamRepo.find({
      select: ['id', 'teamName'],
      order: { id: 'ASC' },
    });
  }
}
