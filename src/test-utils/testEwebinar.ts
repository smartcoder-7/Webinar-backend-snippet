import faker from 'faker';
import { getCustomRepository } from 'typeorm';
import { Team } from '../modules/team/entities/Team';
import { User } from '../modules/user/entities/User';
import { EWebinar } from '../modules/ewebinar/entities/EWebinar';
import { EWebinarRepository } from '../modules/ewebinar/EWebinarRepository';
import { TeamRepository } from '../modules/team/TeamRepository';
import { gCall } from './gCall';
import { testUser } from './testUser';
import { IDType } from '../types/IDType';
import { TokenPayload } from '../modules/user/resolvers/createTokens';

let randomUser: User;
let presenter: User;

const genUnrelatedTeam = async () => {
  const teamRepository = getCustomRepository(TeamRepository);
  if (!randomUser) {
    randomUser = await testUser();
  }
  if (!presenter) {
    presenter = await testUser();
  }
  return teamRepository.findOneByOwner(randomUser.id);
};

export const testEwebinar = async (userId: string): Promise<EWebinar> => {
  const ewebinarRepository = getCustomRepository(EWebinarRepository);
  const teamRepository = getCustomRepository(TeamRepository);
  const team = await teamRepository.findOneByOwner(userId);
  const ewebinar = new EWebinar();
  ewebinar.title = faker.random.words();
  ewebinar.team = Promise.resolve(team) as Promise<Team>;
  await ewebinarRepository.save(ewebinar);

  return ewebinar;
};

export const unrelatedTestEwebinar = async (): Promise<EWebinar> => {
  const ewebinarRepository = getCustomRepository(EWebinarRepository);
  const team = await genUnrelatedTeam();
  const ewebinar = new EWebinar();
  ewebinar.title = faker.random.words();
  ewebinar.team = Promise.resolve(team) as Promise<Team>;
  await ewebinarRepository.save(ewebinar);

  return ewebinar;
};

export const testEwebinars = async (userId: string): Promise<EWebinar[]> => {
  const ewebinarRepository = getCustomRepository(EWebinarRepository);
  const teamRepository = getCustomRepository(TeamRepository);
  const team = await teamRepository.findOneByOwner(userId);
  const unrelatedTeam = await genUnrelatedTeam();
  const ewebinar1 = new EWebinar();
  const ewebinar2 = new EWebinar();
  const unrelatedEwebinar = new EWebinar();
  ewebinar1.title = faker.random.words();
  ewebinar2.title = faker.random.words();
  unrelatedEwebinar.title = faker.random.words();
  ewebinar1.team = Promise.resolve(team) as Promise<Team>;
  ewebinar2.team = Promise.resolve(team) as Promise<Team>;
  unrelatedEwebinar.team = Promise.resolve(unrelatedTeam) as Promise<Team>;
  await ewebinarRepository.save(ewebinar1);
  await ewebinarRepository.save(ewebinar2);
  await ewebinarRepository.save(unrelatedEwebinar);
  return [ewebinar1, ewebinar2, unrelatedEwebinar];
};

export const createEwebinarUsingMutation = async (req: TokenPayload): Promise<IDType> => {
  const createEwebinarMutation = `
    mutation CreateEWebinar($data: CreateEwebinarInput!) {
      createEwebinar(
        data: $data
      ) {
        id
        title
      }
    }
  `;

  const ewebinar = await gCall({
    source: createEwebinarMutation,
    variableValues: {
      data: {
        title: faker.random.words(),
      },
    },
    req,
  });

  return ewebinar!.data!.createEwebinar!.id;
};
