import { TestUtil } from '../../../test-utils/index';
import { User } from '../../user/entities/User';
import { gCall } from '../../../test-utils/gCall';
import { testCreateUserAndTeam } from '../../../test-utils/testUser';
import { createEwebinarUsingMutation } from '../../../test-utils/testEwebinar';
import { notificationQuery } from '../../../test-utils/testNotification';

const notificationTypes: string[] = ['confirmation', 'reminder', 'followUp'];

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

describe('Get eWebinar notifications', () => {
  it('fetches eWebinar notifications that are editable by current logged user', async () => {
    // fetch notifications of ewebinars
    const response = await gCall({
      source: notificationQuery,
      userId: me.id,
      variableValues: {
        ewebinarId,
      },
    });

    const notifications = response!.data!.getEwebinarNotifications;

    expect(notifications).toHaveLength(4);
    notifications.map((notification: { type: any }) => {
      expect(notification).toHaveProperty('id');
      expect(notification).toHaveProperty('type');
      expect(notification).toHaveProperty('sendBy');
      expect(notificationTypes).toContain(notification.type);
    });
  });
});
