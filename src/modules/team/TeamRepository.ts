import { EntityRepository, QueryRunner, Repository, SelectQueryBuilder } from 'typeorm';

import { Team } from './entities/Team';
import { IDType } from '../../types/IDType';
import { MyRequest } from '../../types/MyContext';
import { ApolloError } from 'apollo-server-express';

type T = Team;

class MySelectQueryBuider extends SelectQueryBuilder<T> {
  public scopeByUser(userId: IDType): MySelectQueryBuider {
    return this.innerJoin('team.userRelations', 'relation', 'relation.user = :userId', { userId });
  }
}

@EntityRepository(Team)
export class TeamRepository extends Repository<T> {
  public createQueryBuilder(_alias?: string, queryRunner?: QueryRunner): MySelectQueryBuider {
    return new MySelectQueryBuider(super.createQueryBuilder('team', queryRunner));
  }

  public async findForUserOrFail(req: MyRequest): Promise<T> {
    const entity = await this.createQueryBuilder()
      .scopeByUser(req.userId)
      .getOne();

    if (!entity) {
      throw new ApolloError(`Entity not found`, 'NOT_FOUND');
    }

    return entity;
  }

  public findBySubdomainOrFail(subdomain: string) {
    return this.findOneOrFail({ where: { subdomain } });
  }

  public async isSubdomainAlreadyExist(req: MyRequest, subdomain: string): Promise<boolean> {
    if (subdomain) {
      const entity = await this.createQueryBuilder()
        .where('subdomain = :subdomain AND id != :teamId', {
          subdomain,
          teamId: req.teamId,
        })
        .getOne();
      if (entity) {
        return true;
      }
    }
    return false;
  }
}
