import { AWSError } from 'aws-sdk';
import AWS from '../../utils/aws';
import config from '../../config';
import {
  EntityRepository,
  QueryRunner,
  Repository,
  SelectQueryBuilder,
  Not,
  IsNull,
  getRepository,
  FindManyOptions,
} from 'typeorm';
import { IDType } from '../../types/IDType';
import { MyRequest } from '../../types/MyContext';
import { ApolloError } from 'apollo-server-core';
import { asyncForEach } from '../../utils/asyncForEach';
import { ConversationRepository } from './ConversationRepository';
import { Message, MessageInput, SocketChatResponse, MessageType } from './entities/Message';
import { Attendee } from '../attendee/entities/Attendee';
import { LiveChatConnection } from './entities/LiveChatConnection';
import { User } from '../user/entities/User';
import { toMySQLDateString } from '../../utils/date';
import {
  sendModeratorChatOfflineEmail,
  sendAttendeeChatOfflineEmail,
} from '../../utils/sendEmail/ChatEmails';
import { EWebinar } from '../ewebinar/entities/EWebinar';
import { UserRepository } from '../user/UserRepository';
import { LiveChatConnectionRepository } from './LiveChatConnectionRepository';
import timeDuoFromTimeIn from '../../utils/timeDuoFromTimeIn';
import { Conversation } from './entities/Conversation';
import { EWebinarSet } from '../ewebinarSet/entities/EWebinarSet';
import moment from 'moment';
import injectWelcomeMessage from '../../utils/injectVariable/welcomeMessage';
import { TeamRepository } from '../team/TeamRepository';
import { OrderDirection } from '../../utils/pagination';

const apiGatewayApi = new AWS.ApiGatewayManagementApi({
  apiVersion: '2018-11-29',
  endpoint: config.API_GATEWAY_ENDPOINT,
});
const numberOfMessageToShowIfOffline: number = 5;

type T = Message;

class MySelectQueryBuider extends SelectQueryBuilder<T> {
  public scopeInTeam(teamId: string): MySelectQueryBuider {
    return this.innerJoin('message.ewebinar', 'ewebinar').innerJoin(
      'ewebinar.team',
      'team',
      'team.id = :teamId',
      {
        teamId,
      }
    );
  }

  public scopeFromDate(fromDate?: string) {
    if (fromDate) {
      return this.andWhere('message.createdAt >= :from', { from: fromDate });
    }
    return this;
  }

  public scopeToDate(toDate?: string) {
    if (toDate) {
      return this.andWhere('message.createdAt <= :to', { to: toDate });
    }
    return this;
  }

  public scopeAttendee(visitorId: string): MySelectQueryBuider {
    return this.andWhere('message.attendee = :visitorId', { visitorId });
  }

  public scopeInEwebinarSet(setId: string): MySelectQueryBuider {
    return this.innerJoin('message.set', 'set', 'set.id = :setId', { setId });
  }

  public scopeUser(userId: string): MySelectQueryBuider {
    return this.andWhere('message.user = :userId', { userId });
  }
}

@EntityRepository(Message)
export class MessageRepository extends Repository<T> {
  public createQueryBuilder(_alias?: string, queryRunner?: QueryRunner): MySelectQueryBuider {
    return new MySelectQueryBuider(super.createQueryBuilder('message', queryRunner));
  }

  public async findInTeamOneOrFail(id: IDType, req: MyRequest): Promise<T> {
    const entity = await this.createQueryBuilder()
      .scopeInTeam(req.teamId)
      .andWhere('message.id = :id', { id })
      .getOne();

    if (!entity) {
      throw new ApolloError(`Entity not found`, 'NOT_FOUND');
    }

    return entity;
  }

  public async findAllForAttendee(
    setId: string,
    attendeeId: string,
    _req: MyRequest
  ): Promise<Message[]> {
    // TODO: Use req for attendeeId

    return await this.createQueryBuilder()
      .scopeInEwebinarSet(setId)
      .scopeAttendee(attendeeId)
      .orderBy('timeSent', 'ASC')
      .getMany();
  }

  public async findAllInConversation(
    conversationId: IDType,
    limit?: number,
    orderDirection: OrderDirection = OrderDirection.Asc
  ): Promise<Message[]> {
    return this.createQueryBuilder()
      .andWhere('message.conversationId = :conversationId', { conversationId })
      .orderBy('timeSent', orderDirection === OrderDirection.Asc ? 'ASC' : 'DESC')
      .limit(limit)
      .getMany();
  }

  public async findLastMessageInConversation(conversationId: IDType): Promise<Message | undefined> {
    return await this.createQueryBuilder()
      .andWhere('message.conversationId = :conversationId', {
        conversationId,
      })
      .orderBy('timeSent', 'DESC')
      .addOrderBy('id', 'DESC')
      .getOne();
  }

  private async broadcastMessage(
    connection: LiveChatConnection,
    message: SocketChatResponse
  ): Promise<boolean> {
    return new Promise(resolve => {
      const params = {
        ConnectionId: connection.connectionId,
        Data: JSON.stringify(message),
      };

      console.log(`Sending message to connection ${connection.connectionId}!`);

      apiGatewayApi.postToConnection(params, (err: AWSError, data: {}) => {
        if (err) {
          console.log(`WARNING: Can\'t send to connection ${connection.connectionId}. `, err);
          // TODO: Delete connection from table if e.code == GoneException
          // I don't think we need async await here
          const deleteConnectionCodes = ['UnknownError'];
          if (deleteConnectionCodes.indexOf(err.code) > -1) {
            getRepository(LiveChatConnection).delete({
              connectionId: connection.connectionId,
            });
          }
          resolve(false);
          return;
        }

        console.log(`Send success to ${connection.connectionId}: `, data);

        resolve(true);
      });
    });
  }

  public async postMessage(
    messageInput: MessageInput,
    connection: LiveChatConnection
  ): Promise<void> {
    const message = await this.manager.transaction(
      async (entityManager): Promise<void> => {
        // get repositories
        const conversationRepository = entityManager.getCustomRepository(ConversationRepository);
        const userRepository = entityManager.getCustomRepository(UserRepository);
        const teamRepository = entityManager.getCustomRepository(TeamRepository);
        const liveChatConnectionRepository = entityManager.getCustomRepository(
          LiveChatConnectionRepository
        );

        let newMessage: Message | undefined;

        // find conversation or create a new one
        const conversation = await conversationRepository.findOrCreateConversationOrFail(
          messageInput,
          connection
        );

        // find set
        const set = await conversation.set;
        if (!set.moderatorId) {
          throw new ApolloError('Error saving chat message');
        }

        // find attendee and ewebinar
        const attendee = conversation.attendee;
        const ewebinar = await attendee.ewebinar!; // Must have ewebinar if chatting
        const [roomType, timeInRoomSecs] = timeDuoFromTimeIn(
          attendee.startTime!,
          ewebinar,
          messageInput.timeSent,
          messageInput.timeInWebinarSecs
        );

        // get moderator (user)
        let user: User;
        let teamId: string | undefined;
        if (connection.userId) {
          // We want to save the current user sending the message not the moderator - it could be an admin
          user = await userRepository.getUserTeamByIdOrFail(connection.userId);
          teamId = connection.teamId;
        } else {
          user = await userRepository.getUserTeamByIdOrFail(set.moderatorId);
          teamId = set.teamId;
        }

        if (!messageInput.type || messageInput.type !== MessageType.Typing) {
          // update conversation sort date
          conversation.sortDate = new Date(toMySQLDateString(messageInput.timeSent));
          // unarchive conversation
          conversation.isArchived = false;
          conversation.save();
          // create new message
          newMessage = new Message({
            fromAttendee: messageInput.fromAttendee,
            content: messageInput.content,
            type: messageInput.type,
            timeSent: messageInput.timeSent,
            roomType,
            timeInRoomSecs,
          });

          newMessage.conversation = conversation;
          newMessage.user = Promise.resolve(user);
          newMessage.set = conversation.set;
          newMessage = await newMessage.save();

          if (!newMessage) {
            throw new ApolloError('Error saving chat message');
          }
        }

        // build where condition
        const condition: FindManyOptions<LiveChatConnection> = {
          where: [
            { userId: Not(IsNull()), teamId },
            { attendeeId: conversation.attendee.id, setId: set.id },
          ],
        };

        // get all connections of the team and all attendees of ewebinar set
        const liveChatConnections = await liveChatConnectionRepository.find(condition);

        if (messageInput.fromAttendee) {
          // is moderator online?
          const isModeratorOnline = !!liveChatConnections.find(liveConnection => {
            return liveConnection.userId && liveConnection.userId === user!.id;
          });

          // add is attendee live field
          conversation.isAttendeeLive = true;

          if (!isModeratorOnline && newMessage) {
            // moderator is offline
            // get last couple of messages of conversation
            const messages = (
              await this.findAllInConversation(
                conversation.id,
                numberOfMessageToShowIfOffline,
                OrderDirection.Desc
              )
            ).reverse();
            const previousMessages = messages.filter(msg => msg.id !== newMessage!.id);

            // Send email to moderator
            await sendModeratorChatOfflineEmail({
              attendee,
              newMessage,
              messages: previousMessages,
              user,
              ewebinar,
              team: await teamRepository.findOneOrFail(teamId),
            });
          }
        } else {
          // is attendee online?
          const isAttendeeOnline = !!liveChatConnections.find(liveConnection => {
            return (
              liveConnection.attendeeId && liveConnection.attendeeId === conversation.attendee.id
            );
          });

          // add is attendee live field
          conversation.isAttendeeLive = isAttendeeOnline;

          if (!isAttendeeOnline && newMessage) {
            // get last couple of messages of conversation
            const messages = (
              await this.findAllInConversation(
                conversation.id,
                numberOfMessageToShowIfOffline,
                OrderDirection.Desc
              )
            ).reverse();
            const previousMessages = messages.filter(msg => newMessage && msg.id !== newMessage.id);

            // Send email to attendee if offline
            await sendAttendeeChatOfflineEmail({
              attendee,
              newMessage,
              messages: previousMessages,
              user,
              ewebinar,
              team: await teamRepository.findOneOrFail(teamId),
            });
          }
        }
        const chatResponse: SocketChatResponse = {
          hasUnreadMessages: conversation.hasUnreadMessages(),
          conversation: {
            id: conversation.id.toString(),
            isArchived: conversation.isArchived,
            inEmail: conversation.inEmail,
            lastReadAt: conversation.lastReadAt!,
            sortDate: conversation.sortDate,
            isAttendeeLive: conversation.isAttendeeLive,
          },
          user: {
            id: user.id.toString(),
            firstName: user.firstName,
            lastName: user.lastName,
            profileMediaUrl: user.profileMediaUrl,
          },
        };
        if (attendee) {
          chatResponse.attendee = {
            id: attendee.id.toString(),
            firstName: attendee.firstName,
            lastName: attendee.lastName,
          };
        }
        switch (messageInput.type) {
          case MessageType.Typing:
            chatResponse.typing = {
              fromAttendee: messageInput.fromAttendee,
              timeSent: messageInput.timeSent,
            };
            break;
          case MessageType.Interaction:
            // TODO: Implement for interaction message
            break;
          case MessageType.Chat:
            if (!newMessage) {
              throw new ApolloError('No message to sent.');
            }
            chatResponse.message = {
              id: newMessage.id.toString(),
              fromAttendee: newMessage.fromAttendee,
              roomType: newMessage.roomType,
              timeInRoomSecs: newMessage.timeInRoomSecs,
              timeSent: newMessage.timeSent,
              content: newMessage.content,
              type: newMessage.type,
            };
            break;
        }

        if (chatResponse.typing) {
          liveChatConnections.forEach((target, idx) => {
            // No need sent typing message to current attendee who typing
            if (
              messageInput.fromAttendee &&
              target.attendeeId &&
              attendee &&
              target.attendeeId.toString() === attendee.id.toString()
            ) {
              liveChatConnections.splice(idx, 1);
            }
            // No need sent typing message to current user who typing
            if (
              !messageInput.fromAttendee &&
              connection.userId &&
              target.userId &&
              target.userId.toString() === connection.userId.toString()
            ) {
              liveChatConnections.splice(idx, 1);
            }
          });
        }

        // send message to all the live connections other than where message came from
        const promises = asyncForEach(
          liveChatConnections,
          async (targetConnection: LiveChatConnection): Promise<boolean> => {
            try {
              return await this.broadcastMessage(targetConnection, chatResponse);
            } catch (e) {
              // TODO: should implement way to track if there is an error occured. Suggestion: Bugsnag ?
              console.error(e);
              return false;
            }
          }
        );

        // TODO: For now wait for all messages to send before committing transaction but will this make posting too slow?
        await Promise.all(promises);
      }
    );

    return message!;
  }

  public async addWelcomeMessage(
    attendee: Attendee,
    conversation: Conversation,
    set: EWebinarSet
  ): Promise<Message> {
    // create welcome message
    const welcomeMsgTimeSent = moment(attendee.joinTime)
      .add(config.WELCOME_MESSAGE_TO_SHOW_AFTER_SECS, 's')
      .toDate();

    // get webinar
    const webinar = (await set!.publicWebinar) as EWebinar;

    // get room type and time in room seconds
    const [roomType, timeInRoomSecs] = timeDuoFromTimeIn(
      attendee.startTime!,
      webinar,
      welcomeMsgTimeSent
    );

    // add a welcome message to conversation
    const welcomeMessage = new Message({
      fromAttendee: false,
      roomType,
      timeInRoomSecs,
      timeSent: welcomeMsgTimeSent,
      content: injectWelcomeMessage(webinar.chatSettings!.privateWelcomeMessage, attendee),
    });
    welcomeMessage.conversation = conversation;
    welcomeMessage.user = set.moderator;
    welcomeMessage.set = Promise.resolve(set);
    return welcomeMessage.save();
  }

  public async countMessageInEwebinarSet(
    ewebinarSetId: IDType,
    fromDate?: string,
    toDate?: string
  ): Promise<number> {
    const query = this.createQueryBuilder()
      .scopeFromDate(fromDate)
      .scopeInEwebinarSet(ewebinarSetId)
      .scopeToDate(toDate);
    return await query.getCount();
  }
}
