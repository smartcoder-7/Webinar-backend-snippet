import { Secret, sign, SignOptions } from 'jsonwebtoken';
import { User } from '../entities/User';
import config from '../../../config';
import { IDType } from '../../../types/IDType';
import { UserRole } from '../../team/entities/TeamUserRelation';
import { Field, ObjectType } from 'type-graphql';

// TODO: When user can change teams (change of team) token must refresh
// TODO: When user role changes, token must refresh

export interface TokenPayload {
  id: IDType;
  role: UserRole;
  teamId: IDType;
  version?: number;
}

@ObjectType()
export class AccessTokens {
  @Field({ nullable: false })
  public refreshToken!: string;

  @Field({ nullable: false })
  public accessToken!: string;
}

const signToken = (token: TokenPayload, secret: Secret, options: SignOptions): string => {
  return sign(token, secret, options);
};

export const createTokens = async (user: User): Promise<AccessTokens> => {
  const relation = (await user.currentTeamRelation!)!;
  const teamId = (await relation.team).id;

  const accessToken = signToken(
    {
      id: user.id,
      role: user.isOps ? UserRole.Ops : relation.role,
      teamId,
    },
    config.ACCESS_TOKEN_SECRET,
    {
      expiresIn: '1d',
    }
  );

  const refreshToken = signToken(
    {
      id: user.id,
      role: user.isOps ? UserRole.Ops : relation.role,
      teamId,
      version: user.version,
    },
    config.REFRESH_TOKEN_SECRET,
    {
      expiresIn: '7d',
    }
  );

  return { refreshToken, accessToken };
};

export const createWorkerToken = async (user: User): Promise<string> => {
  const relation = (await user.currentTeamRelation!)!;

  const accessToken = signToken(
    {
      id: user.id,
      role: UserRole.Ops, // TODO: Should be Worker?
      teamId: (await relation.team).id,
    },
    config.ACCESS_TOKEN_SECRET,
    {
      expiresIn: '1d',
    }
  );

  return accessToken;
};
