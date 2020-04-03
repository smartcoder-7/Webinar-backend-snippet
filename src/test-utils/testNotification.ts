export const notificationQuery = `
  query GetNotification($ewebinarId: Int!) {
    getEwebinarNotifications(ewebinarId: $ewebinarId) {
      id
      type
      sendBy
    }
  }
`;

export const createNotificationQuery = `
  mutation GetNotification($ewebinarId: Int!, $data: CreateNotificationInput!) {
    createNotification(
      ewebinarId: $ewebinarId,
      data: $data
    ) {
      id
      type
      sendBy
      subject
      message
    }
  }
`;

export const updateNotificationQuery = `
  mutation UpdateNotification($id: Int!, $data: UpdateNotificationInput!) {
    updateNotification(
      data: $data
    ) {
      id
      type
      sendBy
      subject
      message
    }
  }
`;

export const deleteNotificationQuery = `
  mutation DeleteNotification($id: Int!) {
    deleteNotification(
      id: $id,
    )
  }
`;
