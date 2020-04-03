import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Conversation, SocketConversationResponse } from './Conversation';
import { ObjectType, Field, ID, InputType, registerEnumType } from 'type-graphql';
import { IDType } from '../../../types/IDType';
import { ORMObject } from '../../../types/ORMObject';
import { EWebinarSet } from '../../ewebinarSet/entities/EWebinarSet';
import { AttendeeIDInput, SocketAttendeeResponse } from '../../attendee/entities/Attendee';
import { User, SocketUserResponse } from '../../user/entities/User';

export enum MessageType {
  Interaction = 'Interaction',
  Typing = 'Typing',
  Chat = 'Chat',
}

registerEnumType(MessageType, {
  name: 'MessageType',
  description: 'Type of message sent via socket',
});
@Entity()
@ObjectType()
export class Message extends ORMObject<Message> {
  @Field(_type => ID)
  @PrimaryGeneratedColumn()
  public readonly id!: IDType;

  @Field(_type => Conversation)
  @ManyToOne(
    _type => Conversation,
    conversation => conversation.messages
  )
  public conversation!: Conversation;
  @RelationId((msg: Message) => msg.conversation)
  public conversationId!: string;

  @Field(_type => User, { nullable: true })
  @ManyToOne(
    _type => User,
    user => user.messages
  )
  public user?: Promise<User>;

  @Field(_type => EWebinarSet)
  @ManyToOne(
    _type => EWebinarSet,
    set => set.messages
  )
  public set!: Promise<EWebinarSet>;

  @RelationId((msg: Message) => msg.set)
  public setId!: string;

  @Field()
  @Column({ default: true })
  public fromAttendee!: boolean;

  @Field()
  @Column({ nullable: true })
  public roomType?: string;

  @Field()
  @Column({ nullable: true })
  public timeInRoomSecs?: number;

  @Field(_type => Date)
  @Column()
  public timeSent!: Date;

  @Field()
  @Column()
  public content!: string;

  @Field(_type => MessageType)
  @Column({
    type: 'enum',
    enum: MessageType,
    default: MessageType.Chat,
  })
  public type!: MessageType;

  @Field()
  @CreateDateColumn()
  public createdAt!: Date;

  @Field()
  @UpdateDateColumn()
  public updatedAt!: Date;
}

@InputType()
export class MessageInput implements Partial<Message> {
  @Field({
    nullable: true,
    description: 'Conversation contains all info needed to add message',
  })
  public conversationId?: IDType;

  @Field(_type => AttendeeIDInput, {
    nullable: true,
    description:
      'Fields necessary to identify fully an attendee.  Must be present if no conversationId present',
  })
  public attendeeId?: AttendeeIDInput;

  @Field({
    nullable: true,
    description: 'Moderator user ID - NULL if message is from Attendee',
  })
  public userId?: IDType;

  @Field()
  @Column()
  public fromAttendee!: boolean;

  @Field(_type => Date, {
    description:
      'Unix timestamp which we can compare to startTime of ewebinar to determine time in room',
  })
  public timeSent!: Date;

  @Field({
    nullable: true,
    description: `Number of seconds into presentation taking starting from 0 at beginning of waiting room.  Note for replays this values starts at waitingRoomDurationSecs and the value would exclude any time the video has been paused`,
  })
  public timeInWebinarSecs?: number;

  @Field({ description: 'Message content' })
  public content?: string;

  @Field({
    description: 'Type of message sent via socket',
  })
  public type!: MessageType;
}

@ObjectType()
export class SocketMessageResponse implements Partial<Message> {
  @Field(_type => ID)
  public readonly id!: IDType;

  @Field()
  public fromAttendee!: boolean;

  @Field()
  public roomType?: string;

  @Field()
  public timeInRoomSecs?: number;

  @Field(_type => Date)
  public timeSent!: Date;

  @Field()
  public content!: string;

  @Field()
  public type!: MessageType;
}

@ObjectType()
export class SocketTypingResponse implements Partial<Message> {
  @Field()
  public fromAttendee!: boolean;

  @Field(_type => Date)
  public timeSent!: Date;
}

@ObjectType()
export class SocketChatResponse {
  @Field(_type => Boolean)
  public hasUnreadMessages!: boolean;

  @Field(_type => SocketMessageResponse, { nullable: true })
  public message?: SocketMessageResponse;

  @Field(_type => SocketTypingResponse, { nullable: true })
  public typing?: SocketTypingResponse;

  @Field(_type => SocketConversationResponse, { nullable: false })
  public conversation!: SocketConversationResponse;

  @Field(_type => SocketUserResponse, { nullable: false })
  public user!: SocketUserResponse;

  @Field(_type => SocketAttendeeResponse, { nullable: true })
  public attendee?: SocketAttendeeResponse;
}
