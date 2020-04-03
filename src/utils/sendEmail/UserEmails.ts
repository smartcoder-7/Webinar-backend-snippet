import { Me, User } from '../../modules/user/entities/User';
import { config } from '../../config';
import { Token } from '../../modules/user/entities/Token';
import { EMAIL_TEMPLATES, sendEmail, UserEntity } from './EmailEntities';

export const sendConfirmationEmail = async (user: Me | User, token: string): Promise<void> => {
  return sendEmail({
    template: EMAIL_TEMPLATES.User.ConfirmEmail,
    fields: {
      url1: `${config.MAIN_FRONTEND_URL}/verify-email?token=${token}`,
    },
    entities: {
      user: await UserEntity.from(user),
    },
    sendTime: new Date(),
  });
};

export const sendResetPasswordEmail = async (user: User, token: Token): Promise<void> => {
  return sendEmail({
    template: EMAIL_TEMPLATES.User.PasswordReset,
    fields: {
      url1: `${config.MAIN_FRONTEND_URL}/change-password?email=${user.email}&token=${token.token}`,
    },
    entities: {
      user: await UserEntity.from(user),
    },
    sendTime: new Date(),
  });
};
