import { Field, InputType, ObjectType, registerEnumType } from 'type-graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EWebinar } from '../../ewebinar/entities/EWebinar';
import { IDType } from '../../../types/IDType';
import { IsNotEmpty } from 'class-validator';
import { ORMObject } from '../../../types/ORMObject';
import { DuplicatableField, DuplicatableClass } from '../../../decorator/DuplicatableClass';

export enum SendBy {
  Email = 'Email',
  Sms = 'Sms',
}

registerEnumType(SendBy, {
  name: 'SendBy',
  description: 'network of notification',
});

export enum NotificationType {
  Confirmation = 'Confirmation',
  Reminder = 'Reminder',
  FollowUp = 'FollowUp',
}

registerEnumType(NotificationType, {
  name: 'NotificationType',
  description: 'Type of notification',
});

export enum WhenUnit {
  Minutes = 'Minutes',
  Hours = 'Hours',
  Days = 'Days',
}

registerEnumType(WhenUnit, {
  name: 'WhenUnit',
  description: 'When units',
});

export enum SendTo {
  AllAttendees = 'AllAttendees',
  DidNotAttend = 'DidNotAttend',
  LeftEarly = 'LeftEarly',
  WatchedUntilEnd = 'WatchedUntilEnd',
}

registerEnumType(SendTo, {
  name: 'SendTo',
  description: 'Send notification up to',
});

@ObjectType()
@Entity()
@DuplicatableClass()
export class Notification extends ORMObject<Notification> {
  @Field()
  @PrimaryGeneratedColumn()
  public readonly id!: IDType;

  @Field()
  @CreateDateColumn()
  public createdAt!: Date;

  @Field()
  @UpdateDateColumn()
  public updatedAt!: Date;

  @Field(_type => EWebinar, { nullable: false })
  @ManyToOne(
    _type => EWebinar,
    (ewebinar: EWebinar) => ewebinar.id,
    { nullable: true, onDelete: 'CASCADE' }
  )
  @DuplicatableField()
  public ewebinar!: Promise<EWebinar>;

  @Field(_type => NotificationType)
  @Column({ type: 'enum', enum: NotificationType })
  @DuplicatableField()
  public type!: NotificationType;

  @Field(_type => SendBy, { description: 'Network to send notification by' })
  @Column({ default: SendBy.Email })
  @DuplicatableField()
  public sendBy!: SendBy;

  @Field({ nullable: false, description: 'Number of Minutes to offset notification by' })
  @Column({ default: 0, nullable: false })
  @DuplicatableField()
  public offsetSeconds!: number;

  @Field()
  public whenNumber!: number;

  @Field(_type => WhenUnit)
  public whenUnit!: WhenUnit;

  @Field()
  @Column()
  @DuplicatableField()
  public subject!: string;

  @Field()
  @Column({ type: 'varchar', length: 2048, nullable: true })
  @DuplicatableField()
  public message!: string;

  @Field(_type => SendTo, {
    nullable: true,
    description: 'Which group of attendees to send the notification to.  (Only for follow ups)',
  })
  @Column({ type: 'enum', enum: SendTo, nullable: true })
  @DuplicatableField()
  public followUpTo?: SendTo;
}

@InputType({ description: 'Create new notification' })
export class NotificationInput implements Partial<Notification> {
  @Field({ nullable: true })
  public id?: IDType;

  @Field()
  public ewebinarId!: IDType;

  @Field()
  @IsNotEmpty()
  public type!: NotificationType;

  @Field()
  @IsNotEmpty()
  public sendBy!: SendBy;

  @Field()
  public whenNumber!: number;

  @Field(_type => WhenUnit)
  public whenUnit!: WhenUnit;

  @Field(_type => SendTo, { nullable: true })
  public followUpTo?: SendTo;

  @Field()
  public subject!: string;

  @Field()
  public message!: string;
}
