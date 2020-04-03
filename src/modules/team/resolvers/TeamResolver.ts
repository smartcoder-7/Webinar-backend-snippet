import { Arg, Authorized, Ctx, Mutation, Query, Resolver } from 'type-graphql';
import { InjectRepository } from 'typeorm-typedi-extensions';
import { getManager } from 'typeorm';
import { Team } from '../entities/Team';
import { TeamRepository } from '../TeamRepository';
import { IDType } from '../../../types/IDType';
import { UserRole, AdminRoles, TeamUserRelation } from '../entities/TeamUserRelation';
import { MyContext } from '../../../types/MyContext';
import { ApolloError } from 'apollo-server-express';
import {
  sendAssignedAsModeratorEmail,
  sendInvitationEmail,
  sendMemberRemovedEmail,
  sendRoleChangedEmail,
} from '../../../utils/sendEmail/TeamEmails';
import { UserRepository } from '../../user/UserRepository';
import { TeamUserRelationRepository } from '../TeamUserRelationRepository';
import { UserAndPresenterInput, UserFilters, UserInTeam } from '../../user/entities/User';
import { generateToken } from '../../../utils/generateToken';
import { PresenterRepository } from '../../presenter/PresenterRepository';
import { sendConfirmationEmail } from '../../../utils/sendEmail/UserEmails';
import { EditPresenterInput } from '../../presenter/entities/Presenter';
import { EWebinarSet } from '../../ewebinarSet/entities/EWebinarSet';
import { EWebinarSetRepository } from '../../ewebinarSet/EWebinarSetRepository';
import { LoginResolvers } from '../../user/resolvers/LoginResolvers';

@Resolver(_of => Team)
export class TeamResolver {
  constructor(@InjectRepository(Team) private readonly teamRepository: TeamRepository) {}

  @Authorized()
  @Query(_returns => Team)
  public async myTeam(@Ctx() ctx: MyContext): Promise<Team> {
    return this.teamRepository.findForUserOrFail(ctx.req);
  }

  @Authorized([UserRole.Ops])
  @Query(_returns => Team)
  public async team(@Arg('id') id: IDType): Promise<Team> {
    return this.teamRepository.findOneOrFail(id);
  }

  @Authorized([UserRole.Ops])
  @Query(_returns => [Team])
  public async teams(): Promise<Team[]> {
    return await this.teamRepository.find();
  }

  @Query(_returns => Team)
  public async teamForSubdomain(@Arg('subdomain') subdomain: string): Promise<Team> {
    return this.teamRepository.findBySubdomainOrFail(subdomain);
  }

  @Authorized(AdminRoles)
  @Query(_returns => [UserInTeam])
  public async teamUsers(
    @Arg('filters') filters: UserFilters,
    @Ctx() ctx: MyContext
  ): Promise<UserInTeam[]> {
    const teamUsers = await getManager()
      .getCustomRepository(TeamUserRelationRepository)
      .findInTeamAll(filters, ctx.req);
    const users = await Promise.all(
      teamUsers.map(async (item: TeamUserRelation) => {
        const user = await item.user;
        const userInTeam = {
          ...user,
          role: item.role,
          invitationStatus: item.invitationStatus,
        } as UserInTeam;
        return userInTeam;
      })
    );
    return users;
  }

  @Authorized(AdminRoles)
  @Mutation(_returns => Team)
  public async addUser(
    @Arg('data') data: UserAndPresenterInput,
    @Ctx() ctx: MyContext
  ): Promise<Team | null> {
    const team = await this.teamRepository.findOneOrFail({ id: ctx.req.teamId });

    await getManager().transaction(async entityManager => {
      const user = await entityManager
        .getCustomRepository(UserRepository)
        .createAndInviteUserToTeam(entityManager, data, ctx.req);

      const inviteToken = generateToken(32);

      const teamUserRepository = entityManager.getCustomRepository(TeamUserRelationRepository);
      const teamUserRelation = await teamUserRepository.findOneOrFail({
        where: {
          team: ctx.req.teamId,
          user: user.id,
        },
      });
      await teamUserRepository.update(teamUserRelation.id, {
        teamInvite: inviteToken,
      });

      await sendInvitationEmail(team, user, inviteToken);
    });

    return team;
  }

  @Authorized(AdminRoles)
  @Mutation(_returns => Team)
  public async removeUser(
    @Arg('id') id: IDType,
    @Arg('replacementId') replacementId: IDType,
    @Ctx() ctx: MyContext
  ): Promise<Team | undefined> {
    let team: Team;

    await getManager().transaction(async entityManager => {
      const teamUserRepository = entityManager.getCustomRepository(TeamUserRelationRepository);
      const teamUserRelation = await teamUserRepository.findOneOrFail({
        where: {
          team: ctx.req.teamId,
          user: id,
        },
      });
      team = await teamUserRelation.team;
      const user = await teamUserRelation.user;
      const assignedSets = await user.assignedSets;

      const relations = await team.userRelations;
      const admins = relations.filter(u => AdminRoles.includes(u.role) && u.userId !== id);
      if (relations.length === 1 || admins.length === 0) {
        throw new ApolloError('You must maintain at least one Admin in a team at all times.');
      }

      const userRepository = entityManager.getCustomRepository(UserRepository);
      const replacementUser = await userRepository.findInTeamOneOrFail(replacementId, ctx.req);
      if (assignedSets && assignedSets.length > 0) {
        assignedSets.map((set: EWebinarSet) => {
          set.moderator = Promise.resolve(replacementUser);
          return set;
        });
        const ewebinarSetRepository = entityManager.getCustomRepository(EWebinarSetRepository);
        await ewebinarSetRepository.save(assignedSets);

        // Wait for emails to be sent out
        await Promise.all(
          assignedSets.map(async (set: EWebinarSet) => {
            const ewebinar = set.publicWebinarId ? await set.publicWebinar : await set.draftWebinar;
            return sendAssignedAsModeratorEmail(team, ewebinar!);
          })
        );
      }

      const presenterRepository = entityManager.getCustomRepository(PresenterRepository);
      const presenter = await presenterRepository.findForCurrentTeamOrFail(id, ctx.req.teamId);
      await presenterRepository.remove(presenter);

      await sendMemberRemovedEmail(team, user);
      await teamUserRepository.remove(teamUserRelation);

      if (ctx.req.userId === id) {
        // I was removing myself - for now force logout
        LoginResolvers.removeAccessCookies(ctx);
      }
    });

    return team!;
  }

  @Authorized(AdminRoles)
  @Mutation(_type => Team, { nullable: true })
  public async updateUser(
    @Arg('data') data: UserAndPresenterInput,
    @Ctx() ctx: MyContext
  ): Promise<Team | undefined> {
    const team = await this.teamRepository.findOneOrFail({ id: ctx.req.teamId });

    await getManager().transaction(async entityManager => {
      const userRepository = entityManager.getCustomRepository(UserRepository);
      const user = await userRepository.findOneOrFail({ id: data.id });

      const { role, presenterId, ...userInput } = data;
      delete userInput.company;
      delete userInput.title;
      delete userInput.bio;
      delete userInput.phone;
      delete userInput.socialLinks;

      if (userInput.email && userInput.email !== user.email) {
        const otherUser = await userRepository.findOne({ email: userInput.email });
        if (otherUser) {
          throw new ApolloError(`Email ${userInput.email} already registered.`);
        }

        const confirmToken = generateToken(32);
        await user.updateWith({
          ...userInput,
          isVerified: false,
          confirmationInvite: confirmToken,
        });

        await sendConfirmationEmail(user, confirmToken);
      } else {
        await user.updateWith(userInput);
      }

      if (presenterId) {
        const presenterInput: EditPresenterInput = { ...userInput, id: presenterId };

        const presenter = await entityManager
          .getCustomRepository(PresenterRepository)
          .findOne(presenterId);

        if (presenter) {
          await presenter.updateWith({
            ...presenterInput,
          });
        }
      }

      const teamUserRepository = entityManager.getCustomRepository(TeamUserRelationRepository);
      const teamUserRelation = await teamUserRepository.findOne({
        where: {
          team: ctx.req.teamId,
          user: data.id,
        },
      });

      if (teamUserRelation && role && teamUserRelation.role !== role) {
        await teamUserRepository.update(teamUserRelation.id, { role });
        await sendRoleChangedEmail(team, user);
      }
    });

    return team;
  }

  @Mutation(_returns => String)
  public async resendInvitationEmail(
    @Arg('userId') userId: string,
    @Arg('teamId') teamId: string
  ): Promise<string> {
    const team = await this.teamRepository.findOneOrFail({ id: teamId });
    await getManager().transaction(async entityManager => {
      const userRepository = entityManager.getCustomRepository(UserRepository);
      const user = await userRepository.findOneOrFail({ id: userId });

      const teamUserRepository = entityManager.getCustomRepository(TeamUserRelationRepository);
      const teamUserRelation = await teamUserRepository.findOneOrFail({
        where: {
          team: teamId,
          user: userId,
        },
      });

      let inviteToken = teamUserRelation.teamInvite;
      if (!inviteToken) {
        inviteToken = generateToken(32);
        await teamUserRepository.update(teamUserRelation.id, {
          teamInvite: inviteToken,
        });
      }

      await sendInvitationEmail(team, user, inviteToken);
    });

    return 'Invitation email sent.';
  }
}
