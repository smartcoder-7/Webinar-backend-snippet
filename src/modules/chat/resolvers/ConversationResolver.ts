import { MessageRepository } from '../MessageRepository';
import { Message } from '../entities/Message';
import { Arg, Authorized, Ctx, Query, Resolver, FieldResolver, Root, Mutation } from 'type-graphql';
import { InjectRepository } from 'typeorm-typedi-extensions';
import { Conversation, ConversationFilters, Conversations } from '../entities/Conversation';
import { ConversationRepository } from '../ConversationRepository';
import { MyContext } from '../../../types/MyContext';
import { IDType } from '../../../types/IDType';
import { AttendeeIDInput } from '../../attendee/entities/Attendee';
import { LiveChatConnectionRepository } from '../LiveChatConnectionRepository';
import { LiveChatConnection } from '../entities/LiveChatConnection';
import { CreatorRoles } from '../../team/entities/TeamUserRelation';

@Resolver(_of => Conversation)
export class ConversationResolver {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: ConversationRepository,
    @InjectRepository(Message)
    private readonly messageRepository: MessageRepository,
    @InjectRepository(LiveChatConnection)
    private readonly liveChatConnectionRepository: LiveChatConnectionRepository
  ) {}

  @Query(_type => Conversation)
  public async conversationForAttendee(@Arg('attendeeId') attendeeId: AttendeeIDInput) {
    return this.conversationRepository.findForAttendeeOneOrFail(attendeeId);
  }

  @Authorized()
  @Query(_type => Conversation)
  public async conversation(@Arg('id') id: IDType, @Ctx() ctx: MyContext) {
    const conversation = this.conversationRepository.findInTeamOneOrFail(id, ctx.req);
    return conversation;
  }

  @Authorized()
  @Query(_type => Conversations)
  public async conversations(
    @Arg('filters') filters: ConversationFilters,
    @Ctx() ctx: MyContext
  ): Promise<Conversations> {
    return await this.conversationRepository.findConversationsInTeamAll(filters, ctx.req);
  }

  @Authorized(CreatorRoles)
  @Mutation(_type => String)
  public async archiveConversation(@Arg('id') id: IDType, @Ctx() ctx: MyContext): Promise<IDType> {
    await this.conversationRepository.findInTeamOneOrFail(id, ctx.req);
    await this.conversationRepository.archive(id);
    return id;
  }

  @Authorized(CreatorRoles)
  @Mutation(_type => Conversation)
  public async seenConversation(
    @Arg('id') id: IDType,
    @Ctx() ctx: MyContext
  ): Promise<Conversation> {
    return await this.conversationRepository.lastSeen(id, ctx.req);
  }

  @FieldResolver()
  public async lastMessage(@Root() conversation: Conversation): Promise<Message | null> {
    // last message already available
    if ('lastMessage' in conversation) {
      return conversation.lastMessage as Message;
    }

    // fetch last message
    const lastMessage = await this.messageRepository.findLastMessageInConversation(conversation.id);
    if (!lastMessage) {
      return null;
    }
    return lastMessage;
  }

  @FieldResolver()
  public async isAttendeeLive(@Root() conversation: Conversation): Promise<boolean> {
    if ('isAttendeeLive' in conversation) {
      return conversation.isAttendeeLive;
    }

    // fetch is attendee live
    const liveConnection = await this.liveChatConnectionRepository.findOne({
      attendeeId: conversation!.attendee.id,
    });
    return !!liveConnection;
  }

  @FieldResolver()
  public async messages(@Root() conversation: Conversation): Promise<Message[] | null> {
    // fetch messages
    return this.messageRepository.findAllInConversation(conversation.id);
  }
}
