import faker from 'faker';
import { getRepository } from 'typeorm';

import { User } from '../entities/User';
import { gCall } from '../../../test-utils/gCall';
import { TestUtil } from '../../../test-utils/index';

beforeAll(async () => {
  await TestUtil.openDbConnection();
  await TestUtil.cleanAll();
});
afterAll(async () => {
  TestUtil.closeDbConnection();
});

const registerMutation = `
mutation Register($data: RegisterInput!) {
  register(
    data: $data
  ) {
    id
    firstName
    lastName
    email
    country
  }
}
`;

describe('Register', () => {
  it('create new user with team', async () => {
    const user = {
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName(),
      email: faker.internet.email(),
      password: faker.internet.password(),
      country: faker.address.country(),
      planId: 'plan_test',
      stripeToken: 'tok_test',
    };
    const response = await gCall({
      source: registerMutation,
      variableValues: {
        data: user,
      },
    });

    expect(response).toMatchObject({
      data: {
        register: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          country: user.country,
        },
      },
    });
    const dbUser = await getRepository(User).findOne({ email: user.email });
    expect(dbUser).toBeDefined();
    expect(dbUser!.firstName).toBe(user.firstName);
    expect(dbUser!.lastName).toBe(user.lastName);
    expect(dbUser!.email).toBe(user.email);
    expect(dbUser!.country).toBe(user.country);
    const dbTeamUserRelation = await dbUser!.teamUserRelations;
    expect(await dbTeamUserRelation[0]!.role).toBe('OWNER');
    expect((await dbTeamUserRelation[0]!.team).plan).toBe('BASIC');
    expect((await dbTeamUserRelation[0]!.user).email).toBe(user.email);
  });

  it('return errors if input is not valid', async () => {
    const user = {
      name: `${faker.name.firstName()} ${faker.name.lastName()}`,
      email: 'invalid email',
      password: faker.internet.password(),
      country: faker.address.country(),
      planId: 'plan_test',
      stripeToken: 'tok_test',
    };
    const response = await gCall({
      source: registerMutation,
      variableValues: {
        data: user,
      },
    });
    expect(response.errors).toBeDefined();
  });
});
