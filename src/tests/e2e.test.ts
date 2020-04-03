import { TestUtil } from '../test-utils';
import { gCall } from '../test-utils/gCall';
import { testEwebinars, testEwebinar } from '../test-utils/testEwebinar';
import { getCustomRepository } from 'typeorm';
import { UserRepository } from '../modules/user/UserRepository';
import faker from 'faker';
import { User } from '../modules/user/entities/User';
import { TokenPayload } from '../modules/user/resolvers/createTokens';

let me: User;
let req: TokenPayload;

beforeAll(async () => {
  await TestUtil.openDbConnection();
  await TestUtil.cleanAll();
});

afterAll(async () => {
  TestUtil.closeDbConnection();
});

const ewebinarsQuery = `
query GetEwebinars {
  ewebinars {
    id
    title
  }
}
`;

describe('User sign up and me', () => {
  it('Create user and team', async () => {
    const user = {
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName(),
      email: faker.internet.email(),
      password: '123123',
    };

    const team = {
      address: {
        country: faker.address.country(),
      },
      stripeCustomerId: 'token_mock',
    };

    me = await getCustomRepository(UserRepository).createUserAndTeam({
      ...user,
      team,
    });

    const relation = await me.currentTeamRelation!;

    req = {
      id: me.id,
      teamId: (await relation.team).id,
      role: relation.role,
    };

    expect(me).toContainEqual(user);
    expect(team).toContainEqual(team);
  });
});

describe('Get eWebinars', () => {
  it('fetches eWebinars that is editable by current logged user', async () => {
    const [ewebinar1, ewebinar2, unrelatedEwebinar] = await testEwebinars(me.id);
    const response = await gCall({
      source: ewebinarsQuery,
      req,
    });
    expect(response!.data!.getEwebinars).toContainEqual({
      id: ewebinar1.id.toString(),
      title: ewebinar1.title,
    });
    expect(response!.data!.getEwebinars).toContainEqual({
      id: ewebinar2.id.toString(),
      title: ewebinar2.title,
    });
    expect(response!.data!.getEwebinars).not.toContainEqual({
      id: unrelatedEwebinar.id.toString(),
      title: unrelatedEwebinar.title,
    });
  });
});

describe('Get eWebinar', () => {
  it('fetches a eWebinar that is editable by current logged user by id', async () => {
    const relatedWebinar = await testEwebinar(me.id);

    const ewebinarQuery = `
      query GetEwebinar {
        ewebinar(id: ${relatedWebinar.id}) {
          id
          title
          moderator {
            id
          }
        }
      }
    `;
    const response = await gCall({
      source: ewebinarQuery,
      variableValues: {
        id: relatedWebinar.id,
      },
      req,
    });
    expect(response).toMatchObject({
      data: {
        ewebinar: {
          id: relatedWebinar.id.toString(),
          title: relatedWebinar.title,
          moderator: {
            id: (await relatedWebinar.moderator!).id,
          },
        },
      },
    });
  });
});
