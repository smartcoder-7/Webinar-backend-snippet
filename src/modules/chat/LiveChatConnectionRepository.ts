import { EntityRepository, QueryRunner, Repository, SelectQueryBuilder } from 'typeorm';
import { LiveChatConnection } from './entities/LiveChatConnection';

type T = LiveChatConnection;

class MySelectQueryBuider extends SelectQueryBuilder<T> {}

@EntityRepository(LiveChatConnection)
export class LiveChatConnectionRepository extends Repository<LiveChatConnection> {
  public createQueryBuilder(_alias?: string, queryRunner?: QueryRunner): MySelectQueryBuider {
    return new MySelectQueryBuider(super.createQueryBuilder('liveChatConnection', queryRunner));
  }
}
