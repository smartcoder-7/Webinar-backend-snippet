import { createConnection } from 'typeorm';
import env from 'dotenv';

env.config();

export const testConn = (drop: boolean = false) => {
  return createConnection({
    type: 'mysql',
    host: process.env.DATABASE_HOST,
    port: 3306,
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: 'ewebinartest',
    synchronize: drop,
    dropSchema: drop,
    entities: [__dirname + '/../modules/*/entities/*.*'],
  });
};
