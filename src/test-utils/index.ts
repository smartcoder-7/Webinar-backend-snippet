import { getConnection } from 'typeorm';
import { testConn } from './testConn';

const openDbConnection = async () => {
  return testConn();
};

const closeDbConnection = async () => {
  const connection = getConnection();
  if (connection.isConnected) {
    await connection.close();
  }
};

const getEntities = async () => {
  const connection = getConnection();
  const entities: any[] = [];
  (await (await connection).entityMetadatas).forEach(x =>
    entities.push({ name: x.name, tableName: x.tableName })
  );
  return entities;
};

const cleanAll = async () => {
  const connection = getConnection();
  const entities = await getEntities();
  try {
    for (const entity of entities) {
      const repository = await connection.getRepository(entity.name);
      await repository.query('SET FOREIGN_KEY_CHECKS = 0;');
      await repository.query(`TRUNCATE TABLE \`${entity.tableName}\`;`);
    }
  } catch (error) {
    throw new Error(`ERROR: Cleaning test db: ${error}`);
  }
};

export const TestUtil = {
  openDbConnection,
  closeDbConnection,
  cleanAll,
};
