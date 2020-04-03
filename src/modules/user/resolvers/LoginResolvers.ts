import { ApolloError, AuthenticationError } from 'apollo-server-core';
import * as bcrypt from 'bcryptjs';
import { Arg, Authorized, Ctx, Field, InputType, Mutation, Resolver } from 'type-graphql';

import { config } from '../../../config';
import { ChangePasswordInput, Me, NewUserAndTeamInput, User } from '../entities/User';
import { Team } from '../../team/entities/Team';
import { MyContext } from '../../../types/MyContext';
import { AccessTokens, createTokens } from './createTokens';
import { InvitationStatus, AdminRoles } from '../../team/entities/TeamUserRelation';
import { InjectRepository } from 'typeorm-typedi-extensions';
import { UserRepository } from '../UserRepository';
import { TeamRepository } from '../../team/TeamRepository';
import { IsEmailAlreadyExist } from '../validators/IsEmailAlreadyExist';
import { IsEmail } from 'class-validator';
import { generateToken } from '../../../utils/generateToken';
import { hashPassword } from '../../../utils/hashPassword';
import { TokenRepository } from '../TokenRepository';
import { Token } from '../entities/Token';
import { sendConfirmationEmail, sendResetPasswordEmail } from '../../../utils/sendEmail/UserEmails';
import { getManager } from 'typeorm';
import { TeamUserRelationRepository } from '../../team/TeamUserRelationRepository';
import {
  sendInvitationAcceptedEmail,
  sendInvitationDeclinedEmail,
} from '../../../utils/sendEmail/TeamEmails';
import Stripe from 'stripe';
import { IDType } from '../../../types/IDType';

/*
 * BUGGG: For some unknown reason I have to put email with @IsEmailAlreadyExist and not in User.ts
 * or I get a decorator issue in UserRepository
 */
@InputType()
export class RegisterUserAndTeamInput extends NewUserAndTeamInput {
  @Field()
  @IsEmail()
  @IsEmailAlreadyExist({ message: 'Email $value already registered.' })
  public email!: string;
}

@Resolver(_of => Me)
export class LoginResolvers {
  constructor(
    @InjectRepository(User) private readonly userRepository: UserRepository,
    @InjectRepository(Team) private readonly teamRepository: TeamRepository,
    @InjectRepository(Token) private readonly tokenRepository: TokenRepository
  ) {}

  public static removeAccessCookies(ctx: MyContext) {
    ctx.res.clearCookie('access-token');
    ctx.res.clearCookie('refresh-token');
  }

  public static async setAccessCookies(user: User, ctx: MyContext): Promise<AccessTokens> {
    const tokens = await createTokens(user);

    ctx.res.cookie('access-token', tokens.accessToken, {
      maxAge: config.accessTokenMaxAge,
      domain: process.env.NODE_ENV !== 'production' ? undefined : config.DOMAIN,
      sameSite: process.env.NODE_ENV !== 'production' ? false : true,
      secure: process.env.NODE_ENV !== 'production' ? false : true,
    });
    ctx.res.cookie('refresh-token', tokens.refreshToken, {
      maxAge: config.refreshTokenMaxAge,
      domain: process.env.NODE_ENV !== 'production' ? undefined : config.DOMAIN,
      sameSite: process.env.NODE_ENV !== 'production' ? false : true,
      secure: process.env.NODE_ENV !== 'production' ? false : true,
    });

    return tokens;
  }

  @Mutation(_returns => Me)
  public async login(
    @Arg('email') email: string,
    @Arg('password') password: string,
    @Ctx() ctx: MyContext
  ): Promise<Me> {
    const me = (await this.userRepository.findOneOrFail({ email })) as Me;

    if (!me.password) {
      throw new AuthenticationError('Please accept the invitation from email.');
    }

    const valid = await bcrypt.compare(password, me.password);
    if (!valid) {
      throw new AuthenticationError("The password you've entered is incorrect.");
    }

    if (!(await me.currentTeamRelation)) {
      throw new ApolloError(`You must first sign-up to create your own team.`, 'SIGN_UP');
    }

    me.tokens = await LoginResolvers.setAccessCookies(me, ctx);
    return me;
  }

  @Authorized()
  @Mutation(_returns => Boolean, { nullable: true })
  public async logout(@Ctx() ctx: MyContext): Promise<boolean> {
    LoginResolvers.removeAccessCookies(ctx);
    return true;
  }

  @Mutation(_returns => Me)
  public async registerUserAndTeam(
    @Arg('data') newUserData: NewUserAndTeamInput,
    @Ctx() ctx: MyContext
  ): Promise<Me> {
    const invitedUser = await this.userRepository.getInvitedUser(newUserData.email);
    if (invitedUser) {
      throw new ApolloError(`Email ${newUserData.email} has been invited.`, 'INVITED_USER', {
        invitedUser,
      });
    }

    const user = await this.userRepository.findByEmail(newUserData.email);
    if (user && user.currentTeamRelation) {
      throw new ApolloError(`Email ${newUserData.email} already registered.`);
    }

    const me = (await this.userRepository.createUserAndTeam(newUserData)) as Me;
    const inviteToken = generateToken(32);

    await this.userRepository.update(me.id, {
      confirmationInvite: inviteToken,
    });

    await sendConfirmationEmail(me, inviteToken);

    me.tokens = await LoginResolvers.setAccessCookies(me, ctx);

    return me;
  }

  @Authorized(AdminRoles)
  @Mutation(_returns => Me)
  public async registerUserInTeam(
    @Arg('team') teamId: string,
    @Arg('data') data: RegisterUserAndTeamInput,
    @Ctx() ctx: MyContext
  ): Promise<Me> {
    const me = (await this.userRepository.createUserInTeam(teamId, data)) as Me;
    const inviteToken = generateToken(32);

    await this.userRepository.update(me.id, {
      confirmationInvite: inviteToken,
    });

    await sendConfirmationEmail(me, inviteToken);

    me.tokens = await LoginResolvers.setAccessCookies(me, ctx);
    return me;
  }

  private async verifyUser(userId: IDType, ctx: MyContext) {
    await this.userRepository.update(userId, {
      isVerified: true,
      confirmationInvite: null,
    });

    const team = await this.teamRepository.findOneOrFail({
      id: ctx.req.teamId,
    });

    const subscriptionId = team.stripeSubscriptionId;
    const customerId = team.stripeCustomerId;

    if (!subscriptionId) {
      if (!customerId || customerId === '') {
        throw new ApolloError('No Stripe Customer ID found');
      }

      const stripe = new Stripe(config.STRIPE_API_KEY, {
        apiVersion: '2020-03-02',
      });

      try {
        const subscriptionList = await stripe.subscriptions.list({
          customer: customerId,
        });

        if (subscriptionList.data.length === 0) {
          // No sub, create one
          const newSub = await stripe.subscriptions.create({
            customer: customerId,
            items: [{ plan: config.STRIPE_STANDARD_PLAN, quantity: 0 }],
            trial_from_plan: true,
          });

          await team.updateWith({ stripeSubscriptionId: newSub.id });
        }
      } catch (err) {
        throw new ApolloError(['Stripe Error:', err.raw.message].join(' '));
      }
    }
  }

  @Mutation(_returns => Me)
  public async verifyToken(
    @Arg('token') token: string,
    @Ctx() ctx: MyContext
  ): Promise<Me | undefined> {
    const me = (await this.userRepository.findOne({
      confirmationInvite: token,
    })) as Me;

    if (!me) {
      throw new ApolloError('Verification expired.');
    }

    if (me.isVerified) {
      throw new ApolloError('Verification no longer needed.');
    }

    await this.userRepository.update(me.id, {
      isVerified: true,
      confirmationInvite: null,
    });
    me.tokens = await LoginResolvers.setAccessCookies(me, ctx);
    return me;
  }

  @Authorized()
  @Mutation(_returns => User)
  public async skipVerifyEmail(@Ctx() ctx: MyContext): Promise<User> {
    if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging') {
      throw new Error('ERROR: function only allow on development environments');
    }

    await this.verifyUser(ctx.req.userId, ctx);
    return this.userRepository.findOneOrFail(ctx.req.userId);
  }

  @Authorized()
  @Mutation(_returns => String)
  public async resendConfirmationEmail(@Ctx() ctx: MyContext): Promise<string> {
    const user = await this.userRepository.findOneOrFail(ctx.req.userId);
    let inviteToken = user.confirmationInvite;

    if (!inviteToken) {
      inviteToken = generateToken(32);
      await this.userRepository.update(user.id, {
        confirmationInvite: inviteToken,
      });
    }

    await sendConfirmationEmail(user, inviteToken);
    return 'Confirmation email sent.';
  }

  @Mutation(_type => String)
  public async resetPassword(@Arg('email') email: string): Promise<string> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      return 'If you\'re an existing user, please see your Inbox for a Password reset email.';
    }
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    const token = await this.tokenRepository.generateResetToken(
      expiresAt,
      'User',
      user.id,
      'reset-password'
    );

    sendResetPasswordEmail(user, token);

    return 'If you\'re an existing user, please see your Inbox for a Password reset email.';
  }

  @Mutation(_type => Me)
  public async changePassword(
    @Arg('data') changePasswordData: ChangePasswordInput,
    @Ctx() ctx: MyContext
  ): Promise<Me> {
    const user = await this.userRepository.findOne({ email: changePasswordData.email });
    if (!user) {
      throw new ApolloError(`Invalid password reset attempt.`);
    }

    const resetToken = await this.tokenRepository.findOne({
      targetType: 'User',
      targetID: user.id,
      tokenType: 'reset-password',
      token: changePasswordData.token,
    });

    if (resetToken) {
      await this.tokenRepository.delete(resetToken.id);
    }

    if (!resetToken || resetToken.expiresAt < new Date()) {
      throw new ApolloError('Invalid password reset attempt.');
    }

    user.password = await hashPassword(changePasswordData.password);
    await this.userRepository.save(user);

    const me = user as Me;
    me.tokens = await LoginResolvers.setAccessCookies(me, ctx);
    return me;
  }

  @Mutation(_returns => Me)
  public async acceptInvitation(
    @Arg('token') token: string,
    @Ctx() ctx: MyContext
  ): Promise<Me | undefined> {
    const teamUserRepository = getManager().getCustomRepository(TeamUserRelationRepository);
    const teamUserRelation = await teamUserRepository.findOne({
      teamInvite: token,
    });

    if (!teamUserRelation) {
      ctx.res.status(404).send({ errors: ['User not found'] });
      return;
    }
    let user = await teamUserRelation.user;
    const team = await teamUserRelation.team;

    await getManager().transaction(async entityManager => {
      user = await this.userRepository.updateUserInvitationStatus(
        entityManager,
        InvitationStatus.Accepted,
        user,
        teamUserRelation
      );
    });

    await sendInvitationAcceptedEmail(team, user);

    const me = user as Me;
    me.tokens = await LoginResolvers.setAccessCookies(me, ctx);
    return me;
  }

  @Mutation(_returns => Boolean)
  public async rejectInvitation(
    @Arg('token') token: string,
    @Ctx() ctx: MyContext
  ): Promise<boolean> {
    const teamUserRepository = getManager().getCustomRepository(TeamUserRelationRepository);
    const teamUserRelation = await teamUserRepository.findOne({
      teamInvite: token,
    });

    if (!teamUserRelation) {
      ctx.res.status(404).send({ errors: ['User not found'] });
      return false;
    }
    let user = await teamUserRelation.user;
    const team = await teamUserRelation.team;

    await getManager().transaction(async entityManager => {
      user = await this.userRepository.updateUserInvitationStatus(
        entityManager,
        InvitationStatus.Rejected,
        user,
        teamUserRelation
      );
    });

    await sendInvitationDeclinedEmail(team, user);

    return true;
  }
}
