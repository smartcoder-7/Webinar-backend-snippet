import { EntityRepository, QueryRunner, Repository, SelectQueryBuilder } from 'typeorm';

import { TeamUserRelation } from './entities/TeamUserRelation';
import { MyRequest } from '../../types/MyContext';
import { UserFilters, UserOrderByFields } from '../user/entities/User';
import { OrderDirection } from '../../utils/pagination';

type T = TeamUserRelation;

class MySelectQueryBuider extends SelectQueryBuilder<T> {
  public scopeInTeam(teamId: string): MySelectQueryBuider {
    return this.andWhere('team_user_relation.teamId = :teamId', { teamId });
  }

  public userJoin(): MySelectQueryBuider {
    return this.innerJoinAndSelect('team_user_relation.user', 'user');
  }
}

@EntityRepository(TeamUserRelation)
export class TeamUserRelationRepository extends Repository<T> {
  public createQueryBuilder(_alias?: string, queryRunner?: QueryRunner): MySelectQueryBuider {
    return new MySelectQueryBuider(super.createQueryBuilder('team_user_relation', queryRunner));
  }

  public async findInTeamAll(filters: UserFilters, req: MyRequest): Promise<T[]> {
    const direction = filters.orderDirection === OrderDirection.Asc ? 'ASC' : 'DESC';
    return this.createQueryBuilder()
      .userJoin()
      .scopeInTeam(req.teamId)
      .orderBy(`user.${filters.orderBy}` || `user.${UserOrderByFields.CreatedAt}`, direction)
      .getMany();
  }
}
