import {
  Arg,
  Authorized,
  Ctx,
  Field,
  FieldResolver,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  Root,
} from 'type-graphql';
import { InjectRepository } from 'typeorm-typedi-extensions';
import { EWebinar } from '../../ewebinar/entities/EWebinar';
import {
  Notification,
  NotificationInput,
  NotificationType,
  SendBy,
  SendTo,
  WhenUnit,
} from '../entities/Notification';
import { EWebinarRepository } from '../../ewebinar/EWebinarRepository';
import { NotificationForAttendee, NotificationRepository } from '../NotificationRepository';
import { MyContext } from '../../../types/MyContext';
import { IDType } from '../../../types/IDType';
import { CreatorRoles } from '../../team/entities/TeamUserRelation';
import { getCustomRepository, getRepository } from 'typeorm';
import { LatestNotificationTimestamp } from '../entities/LatestNotificationTimestamp';

@ObjectType()
export class NotificationsAndTime {
  @Field(_type => [NotificationForAttendee])
  public notifications!: NotificationForAttendee[];

  @Field(_type => Date)
  public currentTimestamp!: Date;
}

@Resolver(_of => Notification)
export class NotificationsResolver {
  constructor(
    @InjectRepository(Notification) private readonly notificationRepository: NotificationRepository,
    @InjectRepository(EWebinar) private readonly ewebinarRepository: EWebinarRepository
  ) {}

  @Authorized()
  @Query(_type => [Notification])
  public async notifications(
    @Arg('ewebinarId') ewebinarId: IDType,
    @Ctx() ctx: MyContext
  ): Promise<Notification[]> {
    return await this.notificationRepository.findInEWebinarAllOrFail(ewebinarId, ctx.req.teamId);
  }

  private offsetFromWhen(type: NotificationType, whenNumber: number, whenUnit: WhenUnit): number {
    return (
      (whenUnit === WhenUnit.Minutes ? 60 : 1) *
      (whenUnit === WhenUnit.Hours ? 60 * 60 : 1) *
      (whenUnit === WhenUnit.Days ? 60 * 60 * 24 : 1) *
      (whenNumber * (type === NotificationType.Reminder ? -1 : 1))
    );
  }

  // create new notification
  @Authorized(CreatorRoles)
  @Mutation(_type => Notification, { nullable: true })
  public async createNotification(
    @Arg('data') newNotificationData: NotificationInput,
    @Ctx() ctx: MyContext
  ): Promise<Notification> {
    const ewebinarId = newNotificationData.ewebinarId!;
    const ewebinar = await this.ewebinarRepository.findInTeamOneOrFail(ewebinarId, ctx.req);

    // create notification
    const notification = await new Notification({
      type: newNotificationData.type,
      sendBy: newNotificationData.sendBy,
      subject: newNotificationData.subject,
      message: newNotificationData.message,
      followUpTo: newNotificationData.followUpTo,
      offsetSeconds: this.offsetFromWhen(
        newNotificationData.type,
        newNotificationData.whenNumber,
        newNotificationData.whenUnit
      ),
      ewebinar: Promise.resolve(ewebinar),
    }).save();

    return notification;
  }

  // @Authorized(UserRole.Worker)

  @Query(_type => NotificationsAndTime)
  public async overdueNotifications(): Promise<NotificationsAndTime> {
    const notificationRepository = getCustomRepository(NotificationRepository);
    const latestNotificationTimestampRepository = getRepository(LatestNotificationTimestamp);

    let latestNotificationTimestamp = await latestNotificationTimestampRepository.findOne();
    if (!latestNotificationTimestamp) {
      latestNotificationTimestamp = new LatestNotificationTimestamp({ timestamp: new Date('0') });
      await latestNotificationTimestamp.save();
    }

    const now = new Date();
    const notifications = await notificationRepository.findNotificationsOverdue(
      latestNotificationTimestamp.timestamp,
      now
    );

    return {
      notifications,
      currentTimestamp: now,
    };
  }

  @Mutation(_type => Date)
  public async updateLatestTimestamp(@Arg('timestamp') timestamp: Date): Promise<Date> {
    const latestNotificationTimestampRepository = getRepository(LatestNotificationTimestamp);
    let latestTimestamp = await latestNotificationTimestampRepository.findOne();
    if (!latestTimestamp) {
      latestTimestamp = new LatestNotificationTimestamp({ timestamp: new Date('0') });
      await latestTimestamp.save();
      return latestTimestamp.timestamp;
    }

    await latestNotificationTimestampRepository.update({ id: latestTimestamp.id }, { timestamp });

    return timestamp;
  }

  @Authorized(CreatorRoles)
  @Mutation(_type => Notification)
  public async updateNotification(
    @Arg('data') data: NotificationInput,
    @Ctx() ctx: MyContext
  ): Promise<Notification> {
    const notification = await this.notificationRepository.findInTeamOneOrFail(data.id!, ctx.req);

    const object = Object.assign(data);
    object.offsetSeconds = this.offsetFromWhen(data.type, data.whenNumber, data.whenUnit);

    object.sendBy = data.sendBy as SendBy;
    if (data.followUpTo) {
      object.followUpTo = data.followUpTo as SendTo;
    }

    delete object.ewebinarId;
    delete object.whenNumber;
    delete object.whenUnit;

    return notification.updateWith(object);
  }

  @Authorized(CreatorRoles)
  @Mutation(_returns => Boolean)
  public async deleteNotification(@Arg('id') id: IDType, @Ctx() ctx: MyContext): Promise<boolean> {
    const notification = await this.notificationRepository.findInTeamOneOrFail(id, ctx.req);

    await this.notificationRepository.remove(notification);
    return true;
  }

  private offsetToWhen(offsetSecs: number): [number, WhenUnit] {
    let units = WhenUnit.Minutes;
    let num = offsetSecs / 60;

    // Confirmations are backwards in time before 0
    if (num < 0) {
      num = num * -1;
    }

    if (num >= 60 && Math.floor(num) === num) {
      num = num / 60;
      units = WhenUnit.Hours;

      if (num >= 24 && Math.floor(num) === num) {
        num = num / 24;
        units = WhenUnit.Days;
      }
    }

    return [num, units];
  }

  @FieldResolver(_type => WhenUnit)
  public async whenUnit(@Root() notification: Notification): Promise<WhenUnit> {
    const [, unit] = this.offsetToWhen(notification.offsetSeconds);
    return unit;
  }

  @FieldResolver()
  public async whenNumber(@Root() notification: Notification): Promise<number> {
    const [num] = this.offsetToWhen(notification.offsetSeconds);
    return num;
  }
}
