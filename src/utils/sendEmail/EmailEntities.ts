import { Me, User } from '../../modules/user/entities/User';
import { IDType } from '../../types/IDType';
import { Field, ObjectType } from 'type-graphql';
import { Attendee } from '../../modules/attendee/entities/Attendee';
import { EWebinar } from '../../modules/ewebinar/entities/EWebinar';
import { NotificationForAttendee } from '../../modules/notification/NotificationRepository';
import { Message } from '../../modules/chat/entities/Message';
import { QMessage, sendSQSWorkerMessage } from '../sendSQSWorkerMessage';
import { Team } from '../../modules/team/entities/Team';
import { ScheduleSettings } from '../../modules/ewebinar/entities/settings/scheduleSettings/ScheduleSettings';
import { UserRole } from '../../modules/team/entities/TeamUserRelation';

export const EMAIL_TEMPLATES = {
  User: {
    ConfirmEmail: 'ConfirmEmail',
    ConfirmChangedEmail: 'ConfirmChangedEmail',
    PasswordReset: 'PasswordReset',
  },
  Team: {
    Invitation: 'TeamMemberInvitation',
    InvitationAccepted: 'TeamMemberInvitationAccepted',
    InvitationDeclined: 'TeamMemberInvitationDeclined',
    AssignedAsModerator: 'TeamMemberAssignedAsModerator',
    MemberRemoved: 'TeamMemberRemoved',
    RoleChanged: 'TeamMemberRoleChanged',
  },
  Chat: {
    ModeratorNotification: 'ModeratorChatNotification',
    AttendeeNotification: 'AttendeeChatNotification',
  },
  Notifications: {
    YouveBeenUnsubscribed: 'YouveBeenUnsubscribed',
  },
  Subscription: {
    YearlyPaymentReceived: 'YearlyPaymentReceived', // Needs parameter for # of days left
    YearlyPaymentRenewal: 'YearlyPaymentRenewal', // Needs parameter for # of days left
    MonthlyPaymentReceived: 'MonthlyPaymentReceived', // Needs parameter for # of days left
    MonthlyPaymentRenewal: 'MonthlyPaymentRenewal', // Needs parameter for # of days left
    TrialEnding: 'TrialEnding', // Needs parameter for # of days left
    AccountSuspendedEnterprise: 'AccountSuspendedEnterprise',
    SubscriptionCancelledEnterprise: 'SubscriptionCancelledEnterprise',
    AccountSuspended: 'AccountSuspended',
    SubscriptionCancelled: 'SubscriptionCancelled',
    PaymentFailureWarningEnterprise: 'PaymentFailureWarningEnterprise',
    PaymentFailureWarning: 'PaymentFailureWarning',
    SubscriptionLevelDowngraded: 'SubscriptionLevelDowngraded',
    SubscriptionUpgraded: 'SubscriptionLevelUpgraded',
  },
  EWebinar: {
    Published: 'EWebinarPublished',
    Unpublished: 'EWebinarUnpublished',
  },
};

@ObjectType()
export class UserEntity implements Partial<Me> {
  @Field()
  public id!: IDType;
  @Field()
  public firstName!: string;
  @Field()
  public lastName!: string;
  @Field()
  public email!: string;
  @Field()
  public timezone!: string;
  @Field(_type => UserRole)
  public role!: UserRole;

  public static async from(user: Me | User): Promise<UserEntity> {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName ? user.lastName : '',
      email: user.email,
      timezone: user.timezone,
      role: (await user.currentTeamRelation!)!.role,
    };
  }
}

@ObjectType()
export class TeamEntity implements Partial<Team> {
  @Field()
  public id!: IDType;
  @Field()
  public name!: string;
  @Field()
  public cc!: string;

  public static async from(team: Team): Promise<TeamEntity> {
    return {
      id: team.id,
      name: team.name || 'Company',
      cc: team.last4 || 'xxxx',
    };
  }
}

@ObjectType()
export class AttendeeEntity implements Partial<Attendee> {
  @Field()
  public id!: IDType;
  @Field()
  public attendeeFields!: string;
  @Field(_type => Date)
  public startTime!: Date;
  @Field()
  public timezone!: string;
  @Field()
  public email!: string;
  @Field()
  public firstName!: string;
  @Field({ nullable: true })
  public lastName?: string;

  public static async from(attendee: Attendee): Promise<AttendeeEntity> {
    return {
      id: attendee.id,
      attendeeFields: JSON.stringify(attendee.attendeeFields),
      startTime: attendee.startTime!,
      timezone: attendee.timezone!,
      email: attendee.email,
      firstName: attendee.firstName,
      lastName: attendee.lastName,
    };
  }
}

@ObjectType()
export class EWebinarEntity implements Partial<EWebinar> {
  @Field()
  public id!: string;
  @Field()
  public title!: string;
  @Field()
  public scheduleSettings?: ScheduleSettings;

  public static async from(ewebinar: EWebinar): Promise<EWebinarEntity> {
    return {
      id: ewebinar.id,
      title: ewebinar.title,
      scheduleSettings: ewebinar.scheduleSettings,
    };
  }
}

@ObjectType()
export class MessageEntity implements Partial<Message> {
  @Field()
  public id!: string;
  @Field()
  public fromAttendee!: boolean;
  @Field()
  public content!: string;
  @Field(_type => Date)
  public timeSent!: Date;

  public static async from(message: Message): Promise<MessageEntity> {
    return {
      id: message.id,
      content: message.content,
      fromAttendee: message.fromAttendee,
      timeSent: message.timeSent,
    };
  }
}

@ObjectType()
export class FromEntities {
  @Field({ nullable: true })
  public name?: string;
  @Field({ nullable: true })
  public email?: string;
}

@ObjectType()
export class ToEntities {
  @Field({ nullable: true })
  public firstName?: string;

  @Field({ nullable: true })
  public lastName?: string;

  @Field({ nullable: true })
  public name?: string;
}

@ObjectType()
export class EmailFields {
  // These are the same as the fields defined in Email Template
  // and allow code to fill some in instead of the template

  @Field({ nullable: true })
  public logoMediaUrl?: string;

  @Field({ nullable: true })
  public title?: string;

  @Field({ nullable: true })
  public content?: string;

  @Field({ nullable: true })
  public name1?: string;

  @Field({ nullable: true })
  public url1?: string;

  @Field({ nullable: true })
  public name2?: string;

  @Field({ nullable: true })
  public url2?: string;
}

@ObjectType()
export class EmailEntities extends EmailFields {
  @Field(_type => FromEntities, { nullable: true })
  public from?: FromEntities;

  @Field(_type => ToEntities, { nullable: true })
  public to?: ToEntities;

  @Field(_type => UserEntity, { nullable: true })
  public user?: UserEntity;

  @Field(_type => TeamEntity, { nullable: true })
  public team?: TeamEntity;

  @Field(_type => EWebinarEntity, { nullable: true })
  public ewebinar?: EWebinarEntity;

  @Field(_type => MessageEntity, { nullable: true })
  public message?: MessageEntity;

  @Field(_type => MessageEntity, { nullable: true })
  public messages?: MessageEntity[];

  @Field(_type => AttendeeEntity, { nullable: true })
  public attendee?: AttendeeEntity;
}

@ObjectType()
export class SendEmailMessage {
  @Field()
  public template!: string;

  @Field(_type => EmailFields, { nullable: false })
  public fields!: EmailFields;

  @Field(_type => EmailEntities)
  public entities!: EmailEntities;

  @Field(_type => Date)
  public sendTime!: Date;
}

@ObjectType()
export class SendNotificationMessage {
  @Field(_type => NotificationForAttendee)
  public notification!: NotificationForAttendee;

  @Field(_type => Date)
  public sendTime!: Date;
}

export const sendEmail = async (msg: SendEmailMessage): Promise<void> => {
  const message: QMessage = {
    sendEmail: msg,
  };

  try {
    await sendSQSWorkerMessage(message, msg.template);
  } catch (e) {
    console.error('EMAIL SEND FAIL: ', msg, ' ERROR: ', e);
  }
};
