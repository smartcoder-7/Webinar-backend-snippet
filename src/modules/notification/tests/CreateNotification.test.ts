import { TestUtil } from '../../../test-utils/index';
import { User } from '../../user/entities/User';
import { gCall } from '../../../test-utils/gCall';
import { testCreateUserAndTeam } from '../../../test-utils/testUser';
import { createEwebinarUsingMutation } from '../../../test-utils/testEwebinar';
import { createNotificationQuery } from '../../../test-utils/testNotification';

let me: User;
let ewebinarid: IDType;
beforeAll(async () => {
  await TestUtil.openDbConnection();
  await TestUtil.cleanAll();
  me = await testCreateUserAndTeam();
  ewebinarId = await createEwebinarUsingMutation(req);
});
afterAll(async () => {
  TestUtil.closeDbConnection();
});

describe('Create eWebinar notification', () => {
  it('create eWebinar notification that are editable by current logged user', async () => {
    const notificationDummyData = {
      type: 'confirmation',
      sendBy: SendBy.Email,
      subject: 'Hey <TestName>, you succesfully registered for <eWebinar name>',
      message:
        '<test eWebinar name> will start at <Scheduled time>. The subject of the eWebinar is...',
    };

    const response = await gCall({
      source: createNotificationQuery,
      userId: me.id,
      variableValues: {
        ewebinarId,
        data: notificationDummyData,
      },
    });

    const notification = response!.data!.createNotification;

    expect(notification).toHaveProperty('id');
    expect(notification).toHaveProperty('type', notificationDummyData.type);
    expect(notification).toHaveProperty('sendBy', notificationDummyData.sendBy);
    expect(notification).toHaveProperty('subject', notificationDummyData.subject);
    expect(notification).toHaveProperty('message', notificationDummyData.message);
  });
});
