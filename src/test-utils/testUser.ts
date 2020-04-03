import faker from 'faker';
import { getCustomRepository } from 'typeorm';

import { UserRepository } from '../modules/user/UserRepository';
import { User } from '../modules/user/entities/User';

let me: User;

export const testUser = () => {
  return getCustomRepository(UserRepository).createUserAndTeam({
    firstName: faker.name.firstName(),
    lastName: faker.name.lastName(),
    email: faker.internet.email(),
    team: {
      address: {
        country: faker.address.country(),
      },
      stripeCustomerId: 'token_mock',
    },
    password: '123123',
  });
};

export const testCreateUserAndTeam = async () => {
  if (!me) {
    me = await getCustomRepository(UserRepository).createUserAndTeam({
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName(),
      email: faker.internet.email(),
      team: {
        address: {
          country: faker.address.country(),
        },
        stripeCustomerId: 'token_mock',
      },
      password: '123123',
    });
  }

  const relation = await me.currentTeamRelation!;
  return {
    me,
    req: {
      id: me.id,
      teamId: (await relation.team).id,
      role: relation.role,
    },
  };
};
