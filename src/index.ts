import { ApolloServer } from 'apollo-server-express';
import 'reflect-metadata';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import express from 'express';
import logger from 'morgan';
import { Container } from 'typedi';
import * as TypeORM from 'typeorm';
// local imports
import { config } from './config';
import { authorizeToken } from './middleware/authorizeToken';
import v1Router from './RestAPI/v1';
import { createSchema } from './utils/createSchema';

// initialize configuration
dotenv.config();

// register 3rd party IOC container
TypeORM.useContainer(Container);

const bootstrap = async () => {
  try {
    // create TypeORM connection
    await TypeORM.createConnection();

    // build TypeGraphQL executable schema
    const schema = await createSchema(Container);

    // Create GraphQL server
    const server = new ApolloServer({
      schema,
      context: ({ req, res }) => ({ req, res }),
      debug: process.env.NODE_ENV !== 'production',
    });

    const app = express();
    app.use(logger('dev'));
    app.use(cookieParser());
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(authorizeToken);

    server.applyMiddleware({ app, cors: config.cors });

    app.use('/healthcheck', require('express-healthcheck')());
    app.use('/v1', v1Router);
    app.use('/', require('express-healthcheck')());

    const port = config.port;
    app.listen({ port }, () =>
      console.log(`🚀 Server ready at http://localhost:${port}${server.graphqlPath}`)
    );
  } catch (err) {
    console.error(err);
  }
};

bootstrap();
