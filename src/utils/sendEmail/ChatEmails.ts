import { User } from '../../modules/user/entities/User';
import { Attendee } from '../../modules/attendee/entities/Attendee';
import { config } from '../../config';
import {
  AttendeeEntity,
  EMAIL_TEMPLATES,
  MessageEntity,
  sendEmail,
  UserEntity,
  EWebinarEntity,
  TeamEntity,
} from './EmailEntities';
import { Message } from '../../modules/chat/entities/Message';
import { EWebinar } from '../../modules/ewebinar/entities/EWebinar';
import { Team } from '../../modules/team/entities/Team';

export const sendModeratorChatOfflineEmail = async ({
  attendee,
  messages,
  newMessage,
  user,
  ewebinar,
  team,
}: {
  attendee: Attendee;
  messages: Message[];
  newMessage: Message;
  user: User;
  ewebinar: EWebinar;
  team: Team;
}) => {
  return sendEmail({
    template: EMAIL_TEMPLATES.Chat.ModeratorNotification,
    fields: {
      name1: 'Open Chat',
      url1: `${config.MAIN_FRONTEND_URL}/portal/dashboard/${newMessage.setId}/chat/${newMessage.conversationId}`,
    },
    entities: {
      user: await UserEntity.from(user),
      ewebinar: await EWebinarEntity.from(ewebinar),
      team: await TeamEntity.from(team),
      attendee: await AttendeeEntity.from(attendee),
      messages: await Promise.all(messages.map(async msg => await MessageEntity.from(msg))),
      message: await MessageEntity.from(newMessage),
    },
    sendTime: new Date(),
  });
};

export const sendAttendeeChatOfflineEmail = async ({
  attendee,
  messages,
  newMessage,
  user,
  ewebinar,
  team,
}: {
  attendee: Attendee;
  messages: Message[];
  newMessage: Message;
  user: User;
  ewebinar: EWebinar;
  team: Team;
}) => {
  return sendEmail({
    template: EMAIL_TEMPLATES.Chat.AttendeeNotification,
    fields: {},
    entities: {
      user: await UserEntity.from(user),
      ewebinar: await EWebinarEntity.from(ewebinar),
      team: await TeamEntity.from(team),
      attendee: await AttendeeEntity.from(attendee),
      messages: await Promise.all(messages.map(async msg => await MessageEntity.from(msg))),
      message: await MessageEntity.from(newMessage),
    },
    sendTime: new Date(),
  });
};
