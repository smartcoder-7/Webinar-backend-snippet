import { TestUtil } from '../../../test-utils/index';
import { User } from '../../user/entities/User';
import { gCall } from '../../../test-utils/gCall';
import { testCreateUserAndTeam } from '../../../test-utils/testUser';
import { createEwebinarUsingMutation } from '../../../test-utils/testEwebinar';
import { notificationQuery, deleteNotificationQuery } from '../../../test-utils/testNotification';

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

describe('Delete eWebinar notification', () => {
  it('delete eWebinar notification that are editable by current logged user', async () => {
    // get notifications
    const notificationsResponse = await gCall({
      source: notificationQuery,
      userId: me.id,
      variableValues: {
        ewebinarId,
      },
    });

    // all existing notifications
    const existingNotifications = notificationsResponse!.data!.getEwebinarNotifications!;
    const beforeDeleteLength = existingNotifications.length;

    // select one existing notification
    const selectedNotification = existingNotifications[0];

    // delete notification data
    await gCall({
      source: deleteNotificationQuery,
      userId: me.id,
      variableValues: {
        id: parseInt(selectedNotification.id),
      },
    });

    const reNotificationsResponse = await gCall({
      source: notificationQuery,
      userId: me.id,
      variableValues: {
        ewebinarId,
      },
    });
    const afterDeleteLength = reNotificationsResponse!.data!.getEwebinarNotifications!.length;

    expect(beforeDeleteLength).toEqual(afterDeleteLength + 1);
  });
});
