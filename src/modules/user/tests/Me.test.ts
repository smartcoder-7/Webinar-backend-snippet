import { TestUtil } from '../../../test-utils/index';

import { UserAndPresenterInput, User } from '../entities/User';
import { gCall } from '../../../test-utils/gCall';
import { testCreateUserAndTeam } from '../../../test-utils/testUser';
import { getRepository } from 'typeorm';
import { TokenPayload } from '../resolvers/createTokens';
import { Team } from '../../team/entities/Team';

beforeAll(async () => {
  await TestUtil.openDbConnection();
  await TestUtil.cleanAll();
});
afterAll(async () => {
  TestUtil.closeDbConnection();
});
let me: User;
let req: TokenPayload;
beforeEach(async () => {
  const ctx = await testCreateUserAndTeam();
  me = ctx.me;
  req = ctx.req;
});

const meQuery = `
query Me {
  me {
    id
    firstName
    lastName
    email
    country
  }
}
`;

describe('Me', () => {
  it('fetched current logged user', async () => {
    const response = await gCall({
      source: meQuery,
      req,
    });
    expect(response).toMatchObject({
      data: {
        me: {
          id: me.id.toString(),
          firstName: me.firstName,
          lastName: me.lastName,
          email: me.email,
          country: (await (await me.currentTeamRelation!).team).address.country,
        },
      },
    });
  });
});

describe('Update me', () => {
  it('update me', async () => {
    const newMe: Partial<UserAndPresenterInput> = {
      profileMediaUrl: 'http://foo.com/image.png-draft',
      firstName: 'foo',
      lastName: 'bar',
      team: {
        name: 'test company',
        subdomain: 'test-domain',
      },
    };

    const response = await gCall({
      source: `mutation UpdateMe($data: UpdateMeInput!) {
          updateMe(data: $data) {
            profileMediaUrl,
            team {
              name
          }
        }`,
      req,
      variableValues: {
        data: newMe,
      },
    });
    expect(response).toMatchObject({
      data: {
        updateMe: {
          isNew: false,
        },
      },
    });
    const dbUser = await getRepository(User).findOne(me.id);
    expect(dbUser!.firstName).toBe('foo');
    expect(dbUser!.lastName).toBe('bar');
    const dbTeam = await getRepository(Team).findOne(req.teamId);
    expect(dbTeam!.name).toBe('test company');
    expect(dbTeam!.subdomain).toBe('test-domain');
    expect(dbTeam!.profileMediaURL).toBe('http://foo.com/image.png');
  });
});
