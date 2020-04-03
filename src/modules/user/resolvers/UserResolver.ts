import { Arg, Authorized, Ctx, FieldResolver, Query, Resolver, Root } from 'type-graphql';
import { User, UserFilters } from '../entities/User';
import { MyContext } from '../../../types/MyContext';
import { InjectRepository } from 'typeorm-typedi-extensions';
import { UserRepository } from '../UserRepository';
import { IDType } from '../../../types/IDType';
import { Team } from '../../team/entities/Team';
import { Presenter } from '../../presenter/entities/Presenter';
import { PresenterRepository } from '../../presenter/PresenterRepository';

@Resolver(_of => User)
export class UserResolver {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: UserRepository,
    @InjectRepository(Presenter)
    private readonly presenterRepository: PresenterRepository
  ) {}

  @Authorized()
  @Query(_returns => User)
  public async user(@Arg('id') id: IDType, @Ctx() ctx: MyContext): Promise<User> {
    return await this.userRepository.findInTeamOneOrFail(id, ctx.req);
  }

  @Authorized()
  @Query(_returns => [User])
  public users(@Arg('filters') filters: UserFilters, @Ctx() ctx: MyContext): Promise<User[]> {
    return this.userRepository.findInTeamAll(filters, ctx.req);
  }

  @Query(_returns => Boolean)
  public async isEmailAlreadyExist(@Arg('email') email: string): Promise<boolean> {
    const user = await this.userRepository.findByEmail(email);
    return !!(user && user.currentTeamRelationId);
  }

  @Authorized()
  @Query(_returns => Boolean)
  public async checkEmptyPassword(@Ctx() ctx: MyContext): Promise<boolean> {
    const user = await this.userRepository.findOne(ctx.req.userId);
    return !!(user && user.password === null);
  }

  @FieldResolver()
  public async name(@Root() user: User): Promise<string> {
    return [user.firstName, user.lastName].join(' ');
  }

  @FieldResolver()
  public async team(@Root() user: User): Promise<Team> {
    return (await user.currentTeamRelation!)!.team;
  }

  @FieldResolver(_type => Presenter)
  public async presenter(@Root() user: User): Promise<Presenter | null> {
    const teamId = (await user.currentTeamRelation)?.teamId;
    if (!teamId) {
      return null;
    }
    return this.presenterRepository.findForCurrentTeamOrFail(user.id, teamId);
  }
}
