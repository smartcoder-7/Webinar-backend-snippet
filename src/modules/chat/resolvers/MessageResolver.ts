import { MessageRepository } from '../MessageRepository';
import { Message } from '../entities/Message';
import { Arg, Query, Resolver, FieldResolver, Root } from 'type-graphql';
import { InjectRepository } from 'typeorm-typedi-extensions';
import { Conversation } from '../entities/Conversation';
import { IDType } from '../../../types/IDType';

@Resolver(_of => Message)
export class MessageResolver {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: MessageRepository
  ) {}

  @Query(_type => [Message])
  public async messages(@Arg('conversationId') conversationId: IDType): Promise<Message[]> {
    return this.messageRepository.findAllInConversation(conversationId);
  }

  @FieldResolver(_type => Message, { nullable: true })
  public async lastMessage(@Root() conversation: Conversation): Promise<Message | null> {
    const lastMessage = await this.messageRepository.findLastMessageInConversation(conversation.id);
    if (!lastMessage) {
      return null;
    }
    return lastMessage;
  }
}
