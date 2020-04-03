import { Request, Response } from 'express';
import { getCustomRepository, getRepository } from 'typeorm';
import { LiveChatConnection } from '../../modules/chat/entities/LiveChatConnection';
import { MessageRepository } from '../../modules/chat/MessageRepository';
import { AttendeeRepository } from '../../modules/attendee/AttendeeRepository';
import { Field, InputType } from 'type-graphql';
import { MessageInput } from '../../modules/chat/entities/Message';
import { AttendeeIDInput } from '../../modules/attendee/entities/Attendee';
import { verify } from 'jsonwebtoken';
import { config } from '../../config';
import { TokenPayload } from '../../modules/user/resolvers/createTokens';
import { liveLeave, liveJoin } from './analytics';

export const createChatConnection = async (req: any, res: Response) => {
  console.log('SOCKET [CONNECT]: ', req.body);

  if (!req.body || !req.body.connectionId) {
    return res.sendStatus(400);
  }

  // Two cases here - User like moderator, and Visitor become Attendee
  const repository = getRepository(LiveChatConnection);
  const liveChatConnection = repository.create({
    connectionId: req.body.connectionId,
    timeConnected: new Date(),
  });
  await repository.save(liveChatConnection);

  return res.status(200).send('Connected');
};

export const deleteChatConnection = async (req: any, res: Response) => {
  console.log('SOCKET [DELETE]: ', req.body);

  if (!req.body.connectionId) {
    console.error('SOCKET [DELETE]: No connection ID on DELETE');
    return res.sendStatus(400);
  }

  const repository = getRepository(LiveChatConnection);

  liveLeave(req.body.connectionId);

  await repository.delete({
    connectionId: req.body.connectionId,
  });

  return res.sendStatus(200);
};

@InputType()
class MessagePost {
  @Field(_type => MessageInput, { nullable: true })
  public chat?: MessageInput;

  @Field({ nullable: true })
  public token?: string;

  @Field(_type => AttendeeIDInput, { nullable: true })
  public attendee?: AttendeeIDInput;
}

@InputType()
class SocketMessage {
  @Field({ nullable: true })
  public connectionId?: string;

  @Field(_type => MessagePost, { nullable: true })
  public post?: MessagePost;
}

export const postMessage = async (req: Request, res: Response) => {
  console.log('SOCKET [POST]: ', req.body);

  try {
    const msg: SocketMessage = (req.body as any) as SocketMessage;
    const post = msg.post;

    const repository = getRepository(LiveChatConnection);
    let connection = await repository.findOneOrFail({
      connectionId: msg.connectionId,
    });

    if (!post) {
      return res.status(200).send(JSON.stringify({ status: 'OK' }));
    }

    if (post.token) {
      const tokenPayload = verify(post.token!, config.ACCESS_TOKEN_SECRET!) as TokenPayload;

      if (
        connection.userId !== tokenPayload.id ||
        connection.role !== tokenPayload.role ||
        connection.teamId !== tokenPayload.teamId
      ) {
        connection.userId = tokenPayload.id;
        connection.role = tokenPayload.role;
        connection.teamId = tokenPayload.teamId;

        connection = await repository.save(connection);
      }
    }

    if (post.attendee) {
      // Convert string to Date
      post.attendee.startTime = new Date(post.attendee.startTime);
      const attendee = await getCustomRepository(AttendeeRepository).findAttendeeOneOrFail(
        post.attendee
      );

      connection.attendeeId = attendee.id;
      connection.setId = post.attendee.setId;
      liveJoin(attendee, connection.connectionId);
      connection = await repository.save(connection);
    }

    if (post.chat) {
      const message = post.chat;

      // Make Date
      message.timeSent = new Date(message.timeSent);

      if (message.fromAttendee) {
        const attendee = await getCustomRepository(AttendeeRepository).findOneOrFail(
          connection.attendeeId
        );

        message.attendeeId = {
          visitorId: attendee.visitorId,
          setId: (await attendee.set).id,
          startTime: attendee.startTime!,
        };
      }

      await getCustomRepository(MessageRepository).postMessage(message, connection);
    }
  } catch (e) {
    console.log('Exception in CHAT POST: ', e);
    return res.status(500).send(JSON.stringify(e));
  }

  return res.status(200).send(JSON.stringify({ status: 'OK' }));
};
