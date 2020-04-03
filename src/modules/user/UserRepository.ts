import {
  EntityManager,
  EntityRepository,
  QueryRunner,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import Stripe from 'stripe';
import { Team } from '../team/entities/Team';
import {
  NewUserAndTeamInput,
  NewUserInput,
  User,
  UserAndPresenterInput,
  UserFilters,
  UserOrderByFields,
  PublicInvitedUser,
  PublicInviter,
} from './entities/User';
import { InvitationStatus, TeamUserRelation, UserRole } from '../team/entities/TeamUserRelation';
import { defaults } from './entities/User.Presenter.defaults';
import { IDType } from '../../types/IDType';
import { MyRequest } from '../../types/MyContext';
import { ApolloError } from 'apollo-server-express';
import { PresenterRepository } from '../presenter/PresenterRepository';
import { TeamUserRelationRepository } from '../team/TeamUserRelationRepository';
import { OrderDirection } from '../../utils/pagination';
import { config } from '../../config';
import { EWebinarRepository } from '../ewebinar/EWebinarRepository';
import { InteractionRepository } from '../interaction/InteractionRepository';
import { NotificationRepository } from '../notification/NotificationRepository';
import { EWebinarSetRepository } from '../ewebinarSet/EWebinarSetRepository';

type T = User;

class MySelectQueryBuider extends SelectQueryBuilder<T> {
  public scopeInTeam(teamId: IDType): MySelectQueryBuider {
    return this.innerJoin('user.teamRelations', 'relation', 'relation.team = :teamId', { teamId });
  }
}

@EntityRepository(User)
export class UserRepository extends Repository<User> {
  public createQueryBuilder(_alias?: string, queryRunner?: QueryRunner): MySelectQueryBuider {
    return new MySelectQueryBuider(super.createQueryBuilder('user', queryRunner));
  }

  public async findInTeamOneOrFail(id: IDType, req: MyRequest): Promise<T> {
    const entity = await this.createQueryBuilder()
      .scopeInTeam(req.teamId)
      .andWhere('user.id = :id', { id })
      .getOne();

    if (!entity) {
      throw new ApolloError(`Entity not found`, 'NOT_FOUND');
    }

    return entity;
  }

  public async findInTeamAll(filters: UserFilters, req: MyRequest): Promise<T[]> {
    const direction = filters.orderDirection === OrderDirection.Asc ? 'ASC' : 'DESC';
    return this.createQueryBuilder()
      .scopeInTeam(req.teamId)
      .orderBy(filters.orderBy || UserOrderByFields.CreatedAt, direction)
      .getMany();
  }

  private async createUser(
    entityManager: EntityManager,
    team: Team,
    data: NewUserInput,
    invitedBy?: IDType
  ) {
    let user = await entityManager.getRepository(User).findOne({ email: data.email });
    if (user && !(await user.currentTeamRelation)) {
      user.updateWith(data);
    } else {
      user = await entityManager.getRepository(User).create({
        ...(await defaults.user(data)),
      });
      await entityManager.save(user);
    }

    const teamUserRelation = new TeamUserRelation();
    if (invitedBy) {
      teamUserRelation.invitedByUser = Promise.resolve(
        await entityManager.getRepository(User).findOneOrFail(invitedBy)
      );
      teamUserRelation.invitationStatus = InvitationStatus.Pending;
    }
    teamUserRelation.user = Promise.resolve(user);
    teamUserRelation.team = Promise.resolve(team);
    teamUserRelation.role = data.role ? data.role : UserRole.Admin;
    await entityManager.save(teamUserRelation);

    const presenterRepository = entityManager.getCustomRepository(PresenterRepository);
    let presenter = await presenterRepository.findInTeamOneByEmail(data.email!, team.id);
    if (presenter) {
      await presenter.updateWith(data);
    } else {
      presenter = presenterRepository.create({
        ...(await defaults.presenter(user, team)),
        ...data,
      });
      presenter.team = Promise.resolve(team);
      presenter.user = Promise.resolve(user);
    }
    await entityManager.save(presenter);

    user.currentTeamRelation = Promise.resolve(teamUserRelation);
    await entityManager.save(user);

    return user;
  }

  public async createAndInviteUserToTeam(
    entityManager: EntityManager,
    data: UserAndPresenterInput,
    req: MyRequest
  ): Promise<User> {
    const team = await entityManager.getRepository(Team).findOneOrFail(req.teamId);

    // TODO: See if user already exists once we support > 1 teams for a user
    return this.createUser(entityManager, team, data, req.userId);
  }

  public async createUserAndTeam(data: NewUserAndTeamInput): Promise<User> {
    let user: User;

    const stripe = new Stripe(config.STRIPE_API_KEY, {
      apiVersion: '2020-03-02',
    });

    const params: Stripe.CustomerCreateParams = {
      name: [data.firstName, data.lastName].join(' '),
      email: data.email,
      payment_method: data.team.paymentMethodID,
    };

    try {
      const customer: Stripe.Customer = await stripe.customers.create(params);
      data.team.stripeCustomerId = customer.id;
      delete data.team.paymentMethodID; // never store this

      try {
        await this.manager.transaction(async entityManager => {
          // repositories
          const teamRepository = entityManager.getRepository(Team);
          const ewebinarRepository = entityManager.getCustomRepository(EWebinarRepository);
          const notificationRepository = entityManager.getCustomRepository(NotificationRepository);
          const interactionRepository = entityManager.getCustomRepository(InteractionRepository);
          const setRepository = entityManager.getCustomRepository(EWebinarSetRepository);

          // create team
          const team = teamRepository.create({
            ...data.team,
          });
          await entityManager.save(team);

          // create user
          user = await this.createUser(entityManager, team, data);

          if (config.DEMO_WEBINAR_SETID) {
            // duplicate demo webinar
            // duplicate ewebinar and presenters
            const set = await setRepository.findOneOrFail(config.DEMO_WEBINAR_SETID);

            if (set.publicWebinarId) {
              const ewebinarId = set.publicWebinarId;

              // create new webinar
              const newEwebinar = await ewebinarRepository.duplicate(ewebinarId, team.id);

              // create resources async
              const [newSet] = await Promise.all([
                // duplicate set
                setRepository.duplicate(set.id, {
                  toEWebinarId: newEwebinar.id,
                  toTeamId: team.id,
                  toModeratorId: user.id,
                }),

                // duplicate notifications
                notificationRepository.duplicateByEwebinar(ewebinarId, set.teamId, newEwebinar.id),

                // duplicate interactions
                interactionRepository.duplicateByEwebinar(ewebinarId, newEwebinar.id),
              ]);

              // point new ewebinar to set
              newEwebinar.set = Promise.resolve(newSet!);
              await ewebinarRepository.save(newEwebinar);
            }
          }
        });

        return user!;
      } catch (err) {
        throw new ApolloError('Could not create user/team.');
      }
    } catch (err) {
      let errorMessage = 'Unknown Error';

      switch (err.type) {
        case 'StripeCardError':
          // A declined card error. Most likely error
          errorMessage = ['Card Error.', err.message].join(' ');
          break;
        case 'StripeRateLimitError':
          errorMessage = 'Too many Stripe API requests too quickly.';
          break;
        case 'StripeConnectionError':
          errorMessage = 'Stripe Connection Error.';
          break;
        case 'StripeAuthenticationError':
          errorMessage = 'Stripe Authentication Error.';
          break;
        default:
          errorMessage = 'Unknown Stripe Error.';
          break;
      }

      throw new ApolloError(errorMessage);
    }
  }

  public async createUserInTeam(teamId: IDType, data: NewUserInput): Promise<User> {
    const team = await this.manager.getRepository(Team).findOneOrFail(teamId);
    return await this.createUser(this.manager, team, data);
  }

  public async updateUserInvitationStatus(
    entityManager: EntityManager,
    invitationStatus: InvitationStatus,
    user: User,
    teamUserRelation: TeamUserRelation
  ): Promise<User> {
    if (invitationStatus === InvitationStatus.Pending) {
      throw new ApolloError('Invalid invitation status sent.');
    }

    const teamUserRepository = entityManager.getCustomRepository(TeamUserRelationRepository);

    await user.updateWith({
      isVerified: true,
      confirmationInvite: null,
    });

    if (invitationStatus === InvitationStatus.Rejected) {
      await teamUserRepository.remove(teamUserRelation);
    } else {
      await teamUserRepository.update(teamUserRelation.id, {
        invitationStatus,
        teamInvite: null,
      });
    }

    return user;
  }

  public async findByEmail(email: string): Promise<User | undefined> {
    return this.createQueryBuilder()
      .andWhere('user.email = :email', { email })
      .getOne();
  }

  public async findInTeamByEmail(email: string, req: MyRequest): Promise<User | undefined> {
    return this.createQueryBuilder()
      .scopeInTeam(req.teamId)
      .andWhere('user.email = :email', { email })
      .getOne();
  }

  public async getUserTeamByIdOrFail(id: IDType): Promise<T> {
    const entity = await this.createQueryBuilder()
      .innerJoinAndSelect('user.teamRelations', 'relation')
      .innerJoinAndSelect('relation.team', 'team')
      .andWhere('user.id = :id', { id })
      .getOne();

    if (!entity) {
      throw new ApolloError(`Entity not found`, 'NOT_FOUND');
    }

    return entity;
  }

  public async findInTeamAllByIdsOrFail(req: MyRequest, userIds: IDType[]): Promise<T[]> {
    const entity = await this.createQueryBuilder()
      .scopeInTeam(req.teamId)
      .andWhere('user.id IN (:userIds)', { userIds })
      .getMany();

    if (!entity) {
      throw new ApolloError(`Entity not found`, 'NOT_FOUND');
    }

    return entity;
  }

  public async getInvitedUser(email: string): Promise<PublicInvitedUser | null> {
    const user = await this.findByEmail(email);
    if (!user) {
      return null;
    }
    const invitedByUserId = (await user.currentTeamRelation)?.invitedByUserId;
    if (!user.currentTeamRelation || !invitedByUserId) {
      return null;
    }
    const usr = await this.findOne(invitedByUserId);
    if (!usr) {
      return null;
    }
    const currentTeamRelation = await user.currentTeamRelation;
    if (!currentTeamRelation) {
      return null;
    }
    const inviter: PublicInviter = {
      id: usr.id.toString(),
      firstName: usr.firstName,
      lastName: usr.lastName,
      profileMediaUrl: usr.profileMediaUrl,
    };
    const invitedUser: PublicInvitedUser = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      role: currentTeamRelation.role,
      teamId: currentTeamRelation.teamId!,
      invitedByUser: inviter,
    };
    return invitedUser;
  }
}
