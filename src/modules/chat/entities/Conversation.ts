import {
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { Attendee } from '../../attendee/entities/Attendee';
import { ObjectType, Field, ID, registerEnumType, InputType } from 'type-graphql';
import { EWebinar } from '../../ewebinar/entities/EWebinar';
import { EWebinarSet } from '../../ewebinarSet/entities/EWebinarSet';
import { IDType } from '../../../types/IDType';
import { Message } from './Message';
import { ORMObject } from '../../../types/ORMObject';
import { OrderDirection } from '../../../utils/pagination';

export enum ConversationTypeFilter {
  Inbox = 'Inbox',
  Archived = 'Archived',
  Unread = 'Unread',
  Live = 'Live',
}

export enum ConversationOrderByFields {
  SortDate = 'sortDate',
  LastReadAt = 'lastReadAt',
}

registerEnumType(ConversationTypeFilter, {
  name: 'ConversationTypeFilter',
});

registerEnumType(ConversationOrderByFields, {
  name: 'ConversationOrderByFields',
  description: 'Allow orderBy fields',
});

@Entity()
@ObjectType()
export class Conversation extends ORMObject<Conversation> {
  @Field(_type => ID)
  @PrimaryGeneratedColumn()
  public readonly id!: IDType;

  @Field(_type => [Message])
  @OneToMany(
    _type => Message,
    message => message.conversation
  )
  public messages?: Promise<Message[]>;

  @Field()
  @Column({ default: false })
  public isArchived!: boolean;

  @Field(_type => EWebinar)
  @ManyToOne(
    _type => EWebinar,
    webinar => webinar.conversations,
    { onDelete: 'CASCADE' }
  )
  public ewebinar!: Promise<EWebinar>;

  @Field(_type => EWebinarSet)
  @ManyToOne(
    _type => EWebinarSet,
    set => set.conversations
  )
  public set!: Promise<EWebinarSet>;

  @Field(_type => Attendee)
  @OneToOne(_type => Attendee)
  @JoinColumn()
  public attendee!: Attendee;

  @Field({
    description: 'This conversation has transitioned to an email conversation',
  })
  @Column({ default: false })
  public inEmail!: boolean;

  @Field(_type => Date, { nullable: true })
  @Column({ nullable: true })
  public lastReadAt?: Date;

  @Field(_type => Date)
  @Column({ nullable: false })
  public sortDate!: Date;

  @Field(_type => Message, { nullable: true })
  public lastMessage?: Message;

  @Field(_type => Boolean)
  public isAttendeeLive!: boolean;

  @Field(_type => Boolean)
  public hasUnreadMessages(): boolean {
    // if fields are not set
    if (!this.lastReadAt) {
      return true;
    }

    return this.lastReadAt < this.sortDate;
  }
}

@InputType()
export class ConversationFilters {
  @Field(_type => ConversationTypeFilter)
  public type!: ConversationTypeFilter;

  @Field({ defaultValue: false })
  public onlyAssigned!: boolean;

  @Field({ nullable: true })
  public setId?: IDType;

  @Field(_type => ConversationOrderByFields, { nullable: true })
  public orderBy?: ConversationOrderByFields;

  @Field(_type => OrderDirection, { nullable: true })
  public orderDirection?: OrderDirection;

  @Field({ nullable: true })
  public cursor?: string;
}

@InputType({ description: 'Update conversation' })
export class UpdateConversationInput {
  @Field()
  public id!: IDType;

  @Field({ nullable: true })
  public isArchived?: boolean;

  @Field({ nullable: true })
  public lastReadAt?: Date;
}

@ObjectType()
export class Conversations {
  @Field(_type => Conversation)
  public conversations!: Conversation[];

  @Field()
  public total!: number;

  @Field({ defaultValue: false })
  public nextCursor?: string;
}

@ObjectType()
export class SocketConversationResponse implements Partial<Conversation> {
  @Field(_type => ID)
  public readonly id!: IDType;

  @Field()
  public isArchived!: boolean;

  @Field()
  public inEmail!: boolean;

  @Field(_type => Date)
  public lastReadAt!: Date;

  @Field(_type => Date)
  public sortDate!: Date;

  @Field(_type => Boolean)
  public isAttendeeLive!: boolean;
}
