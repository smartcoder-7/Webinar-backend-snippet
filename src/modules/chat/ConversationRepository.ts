import {
  EntityRepository,
  getCustomRepository,
  getManager,
  QueryRunner,
  Repository,
  SelectQueryBuilder,
  UpdateResult,
} from 'typeorm';
import {
  Conversation,
  ConversationFilters,
  ConversationTypeFilter,
  ConversationOrderByFields,
  Conversations,
} from './entities/Conversation';
import { MyRequest } from '../../types/MyContext';
import { IDType } from '../../types/IDType';
import { MessageInput, Message } from './entities/Message';
import { AttendeeIDInput } from '../attendee/entities/Attendee';
import { EWebinarRepository } from '../ewebinar/EWebinarRepository';
import { ApolloError } from 'apollo-server-express';
import { AttendeeRepository } from '../attendee/AttendeeRepository';
import { EWebinar } from '../ewebinar/entities/EWebinar';
import { LiveChatConnection } from './entities/LiveChatConnection';
import { toMySQLDateString } from '../../utils/date';
import { queryWithPagination, OrderDirection } from '../../utils/pagination';
import moment from 'moment';
import { MessageRepository } from './MessageRepository';

type T = Conversation;

class MySelectQueryBuider extends SelectQueryBuilder<T> {
  constructor(qb: SelectQueryBuilder<T>) {
    super(qb);
    // Removed return this.innerJoinAndSelect('conversation.attendee', 'attendee');
    // Because we have an issues with getCount() function (Typeorm): duplicate inner join with attendee
  }

  public attendee(): MySelectQueryBuider {
    return this.innerJoinAndSelect('conversation.attendee', 'attendee');
  }

  public scopeByType(
    type: ConversationTypeFilter = ConversationTypeFilter.Inbox
  ): MySelectQueryBuider {
    let query = this.andWhere('conversation.isArchived = :isArchived', {
      isArchived: type === ConversationTypeFilter.Archived,
    });
    switch (type) {
      case ConversationTypeFilter.Live:
        query = query.andWhere('liveChatConnection.connectionId IS NOT NULL');
        break;
      case ConversationTypeFilter.Unread:
        query = query.andWhere('conversation.lastReadAt < conversation.sortDate');
        break;
      case ConversationTypeFilter.Inbox:
        // Already handled above
        break;
      case ConversationTypeFilter.Archived:
        // Already handled above
        break;
    }

    return query;
  }

  public scopeInTeam(teamId: IDType): MySelectQueryBuider {
    return this.innerJoin('conversation.ewebinar', 'ewebinar', 'ewebinar.team = :teamId', {
      teamId,
    });
  }
}

@EntityRepository(Conversation)
export class ConversationRepository extends Repository<Conversation> {
  public createQueryBuilder(_alias?: string, queryRunner?: QueryRunner): MySelectQueryBuider {
    return new MySelectQueryBuider(super.createQueryBuilder('conversation', queryRunner));
  }

  public async findInTeamOne(id: IDType, req: MyRequest): Promise<Conversation | undefined> {
    return this.createQueryBuilder()
      .attendee()
      .scopeInTeam(req.teamId)
      .andWhere('conversation.id = :id', { id })
      .getOne();
  }

  public async findInTeamOneOrFail(id: IDType, req: MyRequest): Promise<Conversation> {
    const conversation = await this.findInTeamOne(id, req);

    if (!conversation) {
      throw new ApolloError('Entity not found');
    }
    return conversation;
  }

  public async findForAttendeeOne(attendeeId: AttendeeIDInput): Promise<Conversation | undefined> {
    return this.createQueryBuilder()
      .attendee()
      .innerJoin(
        'conversation.attendee',
        'person',
        'person.visitorId = :visitorId AND person.setId = :setId AND person.startTime = :startTime',
        {
          visitorId: attendeeId.visitorId,
          setId: attendeeId.setId,
          startTime: toMySQLDateString(attendeeId.startTime),
        }
      )
      .getOne();
  }

  public async findForAttendeeOneOrFail(attendeeId: AttendeeIDInput): Promise<Conversation> {
    const conversation = await this.findForAttendeeOne(attendeeId);

    if (!conversation) {
      throw new ApolloError('Conversation not found');
    }

    return conversation;
  }

  public getOrderByFieldName(orderBy: ConversationOrderByFields): keyof Conversation {
    switch (orderBy) {
      case ConversationOrderByFields.SortDate:
        return 'sortDate';
      case ConversationOrderByFields.LastReadAt:
        return 'lastReadAt';
    }
  }

  public async findConversationsInTeamAll(
    filters: ConversationFilters,
    req: MyRequest
  ): Promise<Conversations> {
    let query = this.createQueryBuilder()
      .attendee()
      .scopeByType(filters.type)
      .scopeInTeam(req.teamId);

    if (filters.onlyAssigned) {
      // Show all conversations across all ewebinars I'm assigned to

      const ewebinarRepository = getManager().getCustomRepository(EWebinarRepository);
      const ewebinars = await ewebinarRepository.findAssignedAll(req);

      query = query.innerJoin('conversation.ewebinar', 'ewebinar', 'ewebinar.id IN (:list)', {
        list: ewebinars.map(e => e.id),
      });
    }

    if (filters.setId) {
      query = query.innerJoin('conversation.set', 'set', 'set.id = :setId', {
        setId: filters.setId,
      });
    }

    // fetch last message
    query.leftJoinAndMapOne(
      'conversation.lastMessage',
      Message,
      'message',
      `message.conversationId = conversation.id AND message.id = (${getManager()
        .createQueryBuilder(Message, 'subMessage')
        .select('subMessage.id', 'messageId')
        .andWhere('subMessage.conversationId = conversation.id')
        .orderBy('subMessage.timeSent', 'DESC')
        .limit(1)
        .getQuery()})`
    );

    // join live chat connection to figure out if attendee is live or not
    query
      .leftJoinAndSelect(
        LiveChatConnection,
        'liveChatConnection',
        `liveChatConnection.connectionId = (
          ${getManager()
            .createQueryBuilder(LiveChatConnection, 'subLiveChatConnection')
            .select('subLiveChatConnection.connectionId', 'connectionId')
            .andWhere('subLiveChatConnection.attendeeId = conversation.attendeeId')
            .orderBy('subLiveChatConnection.timeConnected', 'DESC')
            .limit(1)
            .getQuery()}
        )`
      )
      .addSelect(
        'CASE WHEN liveChatConnection.connectionId IS NULL THEN FALSE ELSE TRUE END',
        'isAttendeeLive'
      );

    // response ordering rules
    const orderBy = this.getOrderByFieldName(filters.orderBy || ConversationOrderByFields.SortDate);
    const orderDirection = filters.orderDirection || OrderDirection.Desc;
    const { newQuery, total, nextCursor } = await queryWithPagination(
      query,
      orderBy,
      orderDirection,
      filters.cursor
    );

    // add is attendee live field
    const { entities: conversations, raw: rawConversations } = await newQuery.getRawAndEntities();
    conversations.map(conversation => {
      conversation.isAttendeeLive =
        rawConversations.find(
          rawConversation => conversation.id === rawConversation.conversation_id
        ).isAttendeeLive > 0;
    });

    return {
      conversations,
      total,
      nextCursor,
    };
  }

  public async findOrCreateConversationOrFail(
    messageInput: MessageInput,
    connection: LiveChatConnection
  ): Promise<Conversation> {
    let conversation: Conversation | undefined;

    if (!messageInput.attendeeId) {
      conversation = await this.findInTeamOne(messageInput.conversationId!, {
        userId: connection.userId!,
        role: connection.role!,
        teamId: connection.teamId!,
      } as MyRequest);
    } else {
      conversation = await this.findForAttendeeOne(messageInput.attendeeId);
    }

    if (!conversation) {
      // no conversation, so create one
      // note: only attendee can send first message
      const attendee = await getCustomRepository(AttendeeRepository).findAttendeeOneOrFail(
        messageInput.attendeeId!
      );

      const set = await attendee.set;

      // Create new conversation
      conversation = new Conversation({
        sortDate: new Date(),
      });
      conversation.attendee = attendee;
      conversation.set = Promise.resolve(set);
      conversation.ewebinar = set!.publicWebinar as Promise<EWebinar>;
      await conversation.save();

      // add welcome message
      // making it async can change the order of welcome message & chat message
      await getCustomRepository(MessageRepository).addWelcomeMessage(attendee, conversation, set);
    }

    return conversation;
  }

  public async archive(id: IDType): Promise<UpdateResult> {
    return this.update(id, {
      isArchived: true,
    });
  }

  public async lastSeen(id: IDType, req: MyRequest): Promise<Conversation> {
    await this.update(id, {
      lastReadAt: moment()
        .utc()
        .toDate(),
    });
    return this.findInTeamOneOrFail(id, req);
  }
}
