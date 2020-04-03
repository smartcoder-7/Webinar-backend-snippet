import { TestUtil } from '../../../test-utils/index';

import { User } from '../entities/User';
import { gCall } from '../../../test-utils/gCall';
import { testCreateUserAndTeam } from '../../../test-utils/testUser';
import { getRepository } from 'typeorm';
import { Token } from '../entities/Token';

beforeAll(async () => {
  await TestUtil.openDbConnection();
  await TestUtil.cleanAll();
});
afterAll(async () => {
  TestUtil.closeDbConnection();
});
let me: Partial<User>;
beforeEach(async () => {
  me = await testCreateUserAndTeam();
});

const resetPasswordMutation = `
mutation ResetPassword {
  resetPassword
}
`;

const changePasswordMutation = `
  mutation ChangePassword($data: ChangePasswordInput!) {
    changePassword(data: $data)
  }
`;

describe('Reset Password reqeust', () => {
  it('generate a new token for user password reset', async () => {
    const response = await gCall({
      source: resetPasswordMutation,
      userId: me.id,
    });
    expect(response).toMatchObject({
      data: {
        resetPassword: 'reset email sent.',
      },
    });
    const dbToken = await getRepository(Token).findOne({
      targetType: 'User',
      targetID: me.id,
      tokenType: 'reset-password',
    });
    expect(dbToken).toBeDefined();
  });

  it('delete all old token for the given user', async () => {
    let resetTokenExist = getRepository(Token).create({
      targetType: 'User',
      targetID: me.id,
      tokenType: 'reset-password',
      token: 'dsfsdfsadf-asdfsdaf-sdaf-sdf-sd-f-asdf',
      expiresAt: new Date(),
    });
    resetTokenExist = await getRepository(Token).save(resetTokenExist);
    await gCall({
      source: resetPasswordMutation,
      userId: me.id,
    });
    const dbOldToken = await getRepository(Token).findOne(resetTokenExist.id);
    expect(dbOldToken).not.toBeDefined();
  });
});

describe('Change Password', () => {
  it('change user password', async () => {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);
    expiresAt.getMinutes();
    let resetTokenExist = getRepository(Token).create({
      targetType: 'User',
      targetID: me.id,
      tokenType: 'reset-password',
      token: 'dsfsdfsadf-asdfsdaf-sdaf-sdf-sd-f-asdf',
      expiresAt,
    });
    resetTokenExist = await getRepository(Token).save(resetTokenExist);
    const changePasswordData = {
      password: 'testpass141251',
      email: me.email,
      token: resetTokenExist.token,
    };
    const response = await gCall({
      source: changePasswordMutation,
      userId: me.id,
      variableValues: {
        data: changePasswordData,
      },
    });
    expect(response).toMatchObject({
      data: {
        changePassword: 'password change success.',
      },
    });
  });
});
