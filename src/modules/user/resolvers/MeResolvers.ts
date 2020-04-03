import {
  Arg,
  ArgumentValidationError,
  Authorized,
  Ctx,
  FieldResolver,
  Mutation,
  Query,
  Resolver,
  Root,
} from 'type-graphql';
import { Me, UpdateUserAndTeamInput, User } from '../entities/User';
import { MyContext } from '../../../types/MyContext';
import { InjectRepository } from 'typeorm-typedi-extensions';
import { UserRepository } from '../UserRepository';
import { getManager } from 'typeorm';
import { TeamRepository } from '../../team/TeamRepository';
import { AccessTokens, createTokens } from './createTokens';
import { generateToken } from '../../../utils/generateToken';
import { sendConfirmationEmail } from '../../../utils/sendEmail/UserEmails';
import { hashPassword } from '../../../utils/hashPassword';
import { TeamUserRelationRepository } from '../../team/TeamUserRelationRepository';

@Resolver(_of => Me)
export class MeResolver {
  constructor(@InjectRepository(User) private readonly userRepository: UserRepository) {}

  @Authorized()
  @Query(_returns => Me, { nullable: true })
  public async me(@Ctx() ctx: MyContext): Promise<Me> {
    return this.userRepository.findOneOrFail(ctx.req.userId) as Promise<Me>;
  }

  @Authorized()
  @Mutation(_returns => Me)
  public async updateMe(
    @Arg('data') data: UpdateUserAndTeamInput,
    @Ctx() ctx: MyContext
  ): Promise<Me> {
    const { team, ...user } = data;

    await getManager().transaction(async entityManager => {
      const userRepository = entityManager.getCustomRepository(UserRepository);
      const _me = await userRepository.findInTeamOneOrFail(ctx.req.userId, ctx.req);

      if (_me.email !== user.email) {
        const inviteToken = generateToken(32);

        await _me.updateWith({
          ...user,
          isVerified: false,
          confirmationInvite: inviteToken,
        });

        await sendConfirmationEmail(_me, inviteToken);
      } else if (!_me.password && user.password) {
        await _me.updateWith({
          ...user,
          password: await hashPassword(user.password),
        });

        const teamUserRepository = entityManager.getCustomRepository(TeamUserRelationRepository);
        const teamUserRelation = await teamUserRepository.findOneOrFail({
          where: {
            team: ctx.req.teamId,
            user: ctx.req.userId,
          },
        });
        await teamUserRepository.update(teamUserRelation.id, { teamInvite: undefined });
      } else {
        await _me.updateWith(user);
      }

      if (team) {
        const teamRepository = entityManager.getCustomRepository(TeamRepository);
        const subdomainExist = await teamRepository.isSubdomainAlreadyExist(
          ctx.req,
          team.subdomain!
        );
        if (subdomainExist) {
          throw new ArgumentValidationError([
            {
              property: 'subdomain',
              constraints: { subdomain: 'Subdomain already in use, choose another.' },
              children: [],
            },
          ]);
        }
        const myTeam = await teamRepository.findOneOrFail(ctx.req.teamId);

        await myTeam.updateWith(team);
      }
    });

    return this.userRepository.findOneOrFail(ctx.req.userId) as Promise<Me>;
  }

  @FieldResolver(_type => AccessTokens)
  public async tokens(@Root() me: Me): Promise<AccessTokens> {
    return await createTokens(me);
  }
}
