import { Brackets, EntityRepository, QueryRunner, Repository, SelectQueryBuilder } from 'typeorm';
import { Notification } from './entities/Notification';
import { Attendee } from '../attendee/entities/Attendee';
import { IDType } from '../../types/IDType';
import { MyRequest } from '../../types/MyContext';
import { ApolloError } from 'apollo-server-core';
import { toMySQLDateString } from '../../utils/date';
import { Field, ObjectType } from 'type-graphql';
import { EWebinar } from '../ewebinar/entities/EWebinar';
import { getEntityDuplicatableFields } from '../../decorator/DuplicatableClass';
import { getObjectValuesUsingArray } from '../../utils/getObjectValues';
const duplicatableNotificationFields = getEntityDuplicatableFields(Notification);

type T = Notification;

@ObjectType()
export class NotificationForAttendee extends Notification {
  @Field(_type => Attendee)
  public attendee!: Attendee;
}

class MySelectQueryBuider extends SelectQueryBuilder<T> {
  public scopeInTeam(teamId: string): MySelectQueryBuider {
    return this.innerJoin('notification.ewebinar', 'ewebinar').innerJoin(
      'ewebinar.team',
      'team',
      'team.id = :teamId',
      { teamId }
    );
  }

  public scopeArePublished(): MySelectQueryBuider {
    return this.innerJoin('notification.ewebinar', 'ewebinar').innerJoin(
      'ewebinar.set',
      'set',
      'set.publicWebinar = ewebinar.id'
    );
  }
}

@EntityRepository(Notification)
export class NotificationRepository extends Repository<T> {
  public createQueryBuilder(_alias?: string, queryRunner?: QueryRunner): MySelectQueryBuider {
    return new MySelectQueryBuider(super.createQueryBuilder('notification', queryRunner));
  }

  public async findInTeamOneOrFail(id: IDType, req: MyRequest): Promise<T> {
    const entity = await this.createQueryBuilder()
      .scopeInTeam(req.teamId)
      .andWhere('notification.id = :id', { id })
      .getOne();

    if (!entity) {
      throw new ApolloError(`Entity not found`, 'NOT_FOUND');
    }

    return entity;
  }

  public async findInEWebinarAll(eWebinarId: IDType, teamId: IDType): Promise<T[]> {
    return this.createQueryBuilder()
      .scopeInTeam(teamId)
      .andWhere('ewebinar.id = :eWebinarId', { eWebinarId })
      .getMany();
  }

  public async findInEWebinarAllOrFail(eWebinarId: IDType, teamId: IDType): Promise<T[]> {
    const entities = await this.findInEWebinarAll(eWebinarId, teamId);

    if (!entities) {
      throw new ApolloError(`Entities not found`, 'NOT_FOUND');
    }

    return entities;
  }

  public async findNotificationsOverdue(
    timestamp: Date,
    nowDate: Date
  ): Promise<NotificationForAttendee[]> {
    const now = toMySQLDateString(nowDate);

    return (await this.createQueryBuilder()
      .scopeArePublished()
      .innerJoinAndMapOne(
        'notification.attendee',
        Attendee,
        'attendee',
        'attendee.ewebinarId = ewebinar.id AND attendee.startTime IS NOT NULL AND attendee.optOut = FALSE'
      )
      .andWhere(
        new Brackets(qb => {
          qb.where(
            `(TIMESTAMPDIFF(SECOND, attendee.startTime, '${now}') > notification.offsetSeconds AND notification.type = 'Reminder' AND TIMESTAMPDIFF(SECOND, attendee.startTime, :latestTimestamp) < notification.offsetSeconds)`,
            { latestTimestamp: timestamp }
          ).orWhere(
            `(TIMESTAMPDIFF(SECOND, DATE_ADD(attendee.startTime, INTERVAL (ewebinar.waitingRoomDurationSecs + ewebinar.duration + ewebinar.exitRoomDurationSecs) SECOND), '${now}') > notification.offsetSeconds AND notification.type = 'FollowUp' AND TIMESTAMPDIFF(SECOND, DATE_ADD(attendee.startTime, INTERVAL (ewebinar.waitingRoomDurationSecs + ewebinar.duration + ewebinar.exitRoomDurationSecs) SECOND), :latestTimestamp) < notification.offsetSeconds)`,
            { latestTimestamp: timestamp }
          );
        })
      )
      .getMany()) as NotificationForAttendee[];
  }

  public async duplicateByEwebinar(
    fromEWebinarId: IDType,
    fromTeamId: IDType,
    toEWebinarId: IDType
  ): Promise<T[] | null> {
    // fetch existing appts
    const existingNotifications = await this.findInEWebinarAll(fromEWebinarId, fromTeamId);

    if (!existingNotifications || existingNotifications.length < 1) {
      return null;
    }

    // create new appts
    const newNotifications = existingNotifications.map(
      existingNotification =>
        new Notification(this.getDuplicatableFields(existingNotification, toEWebinarId))
    );

    return this.save(newNotifications);
  }

  private getDuplicatableFields(notification: Notification, ewebinarId: IDType): Partial<T> {
    return {
      // add all duplicatable fields from existing record
      ...getObjectValuesUsingArray(notification, duplicatableNotificationFields),
      // overwrite fileds and add promise fields
      ewebinar: Promise.resolve(new EWebinar({ id: ewebinarId })),
    };
  }
}
