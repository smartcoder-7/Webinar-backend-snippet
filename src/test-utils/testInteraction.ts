import faker from 'faker';

const dataToFetch = `
  id
  type
  room
  appearAt
  details {
    imageMediaUrl
    title
    description
    buttonText
    resultsAppearAt
    answer1
    answer2
    answer3
    answer4
    downloadLink
    offerLink
    offerEndsIn
  }
`;

export const interactionDummyData = {
  type: 'question',
  room: 'presentation',
  appearAt: faker.random.number(1000),
  details: {
    imageMediaUrl: faker.internet.avatar(),
    title: faker.random.words(),
  },
};

export const interactionQuery = `
  query GetInteraction($ewebinarId: Int!) {
    getEwebinarInteractions(ewebinarId: $ewebinarId) {
      ${dataToFetch}
    }
  }
`;

export const createInteractionQuery = `
  mutation CreateInteraction($ewebinarId: Int!, $data: CreateInteractionInput!) {
    createInteraction(
      ewebinarId: $ewebinarId,
      data: $data
    ) {
      ${dataToFetch}
    }
  }
`;

export const updateInteractionQuery = `
  mutation UpdateInteraction($id: Int!, $data: UpdateInteractionInput!) {
    updateInteraction(
      id: $id,
      data: $data
    ) {
      ${dataToFetch}
    }
  }
`;

export const deleteInteractionQuery = `
  mutation DeleteInteraction($id: Int!) {
    deleteInteraction(
      id: $id,
    )
  }
`;

export const testInteraction = (interaction: any) => {
  expect(interaction).toHaveProperty('id');
  expect(interaction).toHaveProperty('type');
  expect(interaction).toHaveProperty('room');
  expect(interaction).toHaveProperty('details.description');
  expect(interaction).toHaveProperty('details.buttonText');
  expect(interaction).toHaveProperty('details.resultsAppearAt');
  expect(interaction).toHaveProperty('details.answer1');
  expect(interaction).toHaveProperty('details.answer2');
  expect(interaction).toHaveProperty('details.answer3');
  expect(interaction).toHaveProperty('details.answer4');
  expect(interaction).toHaveProperty('details.downloadLink');
  expect(interaction).toHaveProperty('details.offerLink');
  expect(interaction).toHaveProperty('details.offerEndsIn');
};
