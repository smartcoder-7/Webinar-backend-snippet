import { User, UserState } from './User';
import { hashPassword } from '../../../utils/hashPassword';
import { Presenter } from '../../presenter/entities/Presenter';
import { RegisterUserAndTeamInput } from '../resolvers/LoginResolvers';
import { Team } from '../../team/entities/Team';

const user = async (data: Partial<RegisterUserAndTeamInput>): Promise<Partial<User>> => {
  const u: Partial<User> = {
    profileMediaUrl: data.profileMediaUrl,
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    confirmationInvite: `${Math.floor(0xffffffff * Math.random())}`,
    state: UserState.New,
  };
  if (data.password) {
    u.password = await hashPassword(data.password!);
  }

  return u;
};

const presenter = async (usr: User, team: Team): Promise<Partial<Presenter>> => {
  const p: Partial<Presenter> = {
    user: Promise.resolve(usr),
    profileMediaUrl: usr.profileMediaUrl,
    email: usr.email,
    firstName: usr.firstName,
    lastName: usr.lastName,
    phone: undefined,
    company: team.name,
    bio: undefined,
    isActive: true,
    socialLinks: undefined,
  };

  return p;
};

export const defaults = {
  user,
  presenter,
};
