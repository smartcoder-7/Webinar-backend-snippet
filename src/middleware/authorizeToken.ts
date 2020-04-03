import { verify } from 'jsonwebtoken';
import { getRepository } from 'typeorm';

import { config } from '../config';
import { User } from '../modules/user/entities/User';
import { createTokens, TokenPayload } from '../modules/user/resolvers/createTokens';
import { MyRequest } from '../types/MyContext';
import { ApolloError } from 'apollo-server-express';

export const authorizeToken = async (req: MyRequest, res: any, next: any) => {
  let refreshToken: string | undefined = req.cookies['refresh-token'];
  let accessToken: string | undefined = req.cookies['access-token'];

  let data;
  if (!refreshToken && !accessToken) {
    accessToken = req.header('Authorization');
    refreshToken = req.header('Authorization Refresh');

    if (!accessToken) {
      return next();
    }

    accessToken = accessToken.split(' ')[1];
    if (refreshToken) {
      refreshToken = refreshToken.split(' ')[1];
    }
  }

  try {
    data = verify(accessToken!, config.ACCESS_TOKEN_SECRET!) as TokenPayload;
    req.userId = data.id;
    req.role = data.role;
    req.teamId = data.teamId;

    return next();
  } catch (e) {
    console.error('Invalid access token (', accessToken!, ') : ', e);
  }

  if (!refreshToken) {
    return next();
  }

  try {
    data = verify(refreshToken!, config.REFRESH_TOKEN_SECRET!) as TokenPayload;
  } catch {
    return next();
  }

  const userRepository = getRepository(User);
  const u = await userRepository.findOne(data.id);
  if (!u || u.version !== data.version) {
    return next();
  }

  const tokens = await createTokens(u);

  res.cookie('access-token', tokens.accessToken, {
    maxAge: config.accessTokenMaxAge,
  });
  res.cookie('refresh-token', tokens.refreshToken, {
    maxAge: config.refreshTokenMaxAge,
  });

  let relation = await u.currentTeamRelation;

  if (!relation) {
    const relations = await u.teamRelations;

    if (relations.length === 0) {
      throw new ApolloError('User is not a member of a team.');
    }

    relation = relations[0];
    u.currentTeamRelation = Promise.resolve(relation);
    u.save();
  }

  req.userId = u.id;
  req.role = relation.role;
  req.teamId = (await relation.team).id;

  return next();
};
