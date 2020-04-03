import { graphql, GraphQLSchema } from 'graphql';
import Maybe from 'graphql/tsutils/Maybe';
import { Container } from 'typedi';
import * as TypeORM from 'typeorm';

import { createSchema } from '../utils/createSchema';
import { TokenPayload } from '../modules/user/resolvers/createTokens';

interface Options {
  source: string;
  variableValues?: Maybe<{
    [key: string]: any;
  }>;
  req: TokenPayload;
}

let schema: GraphQLSchema;

// register 3rd party IOC container
TypeORM.useContainer(Container);

export const gCall = async ({ source, variableValues, req }: Options) => {
  if (!schema) {
    schema = await createSchema(Container);
  }
  return graphql({
    schema,
    source,
    variableValues,
    contextValue: {
      req,
      res: {
        clearCookie: jest.fn(),
        cookie: jest.fn(),
      },
    },
  });
};
