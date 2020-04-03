import { config } from '../../config';
import {
  EMAIL_TEMPLATES,
  sendEmail,
  TeamEntity,
  EWebinarEntity,
  UserEntity,
} from './EmailEntities';
import { Team } from '../../modules/team/entities/Team';
import { EWebinar } from '../../modules/ewebinar/entities/EWebinar';
import { User } from '../../modules/user/entities/User';

export const sendInvitationEmail = async (team: Team, user: User, token: string): Promise<void> => {
  return sendEmail({
    template: EMAIL_TEMPLATES.Team.Invitation,
    fields: {
      name1: 'Accept Invite',
      url1: `${config.MAIN_FRONTEND_URL}/verification/accept-invite?token=${token}`,
      name2: 'Decline Invite',
      url2: `${config.MAIN_FRONTEND_URL}/verification/reject-invite?token=${token}`,
    },
    entities: {
      team: await TeamEntity.from(team),
      user: await UserEntity.from(user),
    },
    sendTime: new Date(),
  });
};

export const sendInvitationAcceptedEmail = async (team: Team, user: User): Promise<void> => {
  return sendEmail({
    template: EMAIL_TEMPLATES.Team.InvitationAccepted,
    fields: {},
    entities: {
      team: await TeamEntity.from(team),
      user: await UserEntity.from(user),
    },
    sendTime: new Date(),
  });
};

export const sendInvitationDeclinedEmail = async (team: Team, user: User): Promise<void> => {
  return sendEmail({
    template: EMAIL_TEMPLATES.Team.InvitationDeclined,
    fields: {},
    entities: {
      team: await TeamEntity.from(team),
      user: await UserEntity.from(user),
    },
    sendTime: new Date(),
  });
};

export const sendRoleChangedEmail = async (team: Team, user: User): Promise<void> => {
  return sendEmail({
    template: EMAIL_TEMPLATES.Team.RoleChanged,
    fields: {},
    entities: {
      team: await TeamEntity.from(team),
      user: await UserEntity.from(user),
    },
    sendTime: new Date(),
  });
};

export const sendAssignedAsModeratorEmail = async (
  team: Team,
  ewebinar: EWebinar
): Promise<void> => {
  return sendEmail({
    template: EMAIL_TEMPLATES.Team.AssignedAsModerator,
    fields: {},
    entities: {
      team: await TeamEntity.from(team),
      ewebinar: await EWebinarEntity.from(ewebinar),
    },
    sendTime: new Date(),
  });
};

export const sendMemberRemovedEmail = async (team: Team, user: User): Promise<void> => {
  return sendEmail({
    template: EMAIL_TEMPLATES.Team.MemberRemoved,
    fields: {},
    entities: {
      team: await TeamEntity.from(team),
      user: await UserEntity.from(user),
    },
    sendTime: new Date(),
  });
};
