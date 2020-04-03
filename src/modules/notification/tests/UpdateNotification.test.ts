import faker from 'faker';
import { TestUtil } from '../../../test-utils/index';
import { User } from '../../user/entities/User';
import { gCall } from '../../../test-utils/gCall';
import { testCreateUserAndTeam } from '../../../test-utils/testUser';
import { createEwebinarUsingMutation } from '../../../test-utils/testEwebinar';
import { notificationQuery, updateNotificationQuery } from '../../../test-utils/testNotification';

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

describe('Update eWebinar notification', () => {
  it('update eWebinar notification that are editable by current logged user', async () => {
    // get notifications
    const notificationsResponse = await gCall({
      source: notificationQuery,
      userId: me.id,
      variableValues: {
        ewebinarId,
      },
    });

    // select one existing notification
    const existingNotification = notificationsResponse!.data!.getEwebinarNotifications[0];

    // data to be updated to
    const notificationDummyData = {
      type: 'confirmation',
      sendBy: SendBy.Email,
      subject: faker.random.words(),
      message: faker.random.words(),
    };

    // update notification data
    const response = await gCall({
      source: updateNotificationQuery,
      userId: me.id,
      variableValues: {
        id: parseInt(existingNotification.id),
        data: notificationDummyData,
      },
    });

    const notification = response!.data!.updateNotification;

    expect(notification).toHaveProperty('id');
    expect(notification).toHaveProperty('type', notificationDummyData.type);
    expect(notification).toHaveProperty('sendBy', notificationDummyData.sendBy);
    expect(notification).toHaveProperty('subject', notificationDummyData.subject);
    expect(notification).toHaveProperty('message', notificationDummyData.message);
  });
});
