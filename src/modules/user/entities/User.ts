import { Field, InputType, ObjectType, registerEnumType } from 'type-graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  RelationId,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { EWebinar } from '../../ewebinar/entities/EWebinar';
import { Presenter, SocialLink } from '../../presenter/entities/Presenter';
import { TeamUserRelation, UserRole, InvitationStatus } from '../../team/entities/TeamUserRelation';
import { IDType } from '../../../types/IDType';
import { IsUrl, IsEmail, IsNotEmpty } from 'class-validator';
import { Team, TeamInput } from '../../team/entities/Team';
import { IsValidPassword } from '../validators/IsValidPassword';
import { ORMObject } from '../../../types/ORMObject';
import { EWebinarSet } from '../../ewebinarSet/entities/EWebinarSet';
import { AccessTokens } from '../resolvers/createTokens';
import { Message } from '../../chat/entities/Message';
import { OrderDirection } from '../../../utils/pagination';

export enum UserState {
  New = 'New',
  HasCreated = 'HasCreated',
  HasPublished = 'HasPublished',
}

registerEnumType(UserState, {
  name: 'UserState',
});

export enum UserOrderByFields {
  CreatedAt = 'createdAt',
  FirstName = 'firstName',
}

registerEnumType(UserOrderByFields, {
  name: 'UserOrderByFields',
  description: 'Allow orderBy fields',
});

@ObjectType()
@Entity()
export class User extends ORMObject<User> {
  @Field()
  @PrimaryGeneratedColumn()
  public readonly id!: IDType;

  @Column({ default: false })
  public isOps!: boolean;

  @Field(_type => [TeamUserRelation])
  @OneToMany(
    _type => TeamUserRelation,
    relation => relation.user,
    { nullable: false }
  )
  public teamRelations!: Promise<TeamUserRelation[]>;

  @Field(_type => TeamUserRelation, { nullable: true })
  @OneToOne(_type => TeamUserRelation, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn()
  public currentTeamRelation?: Promise<TeamUserRelation | null>;

  @RelationId((user: User) => user.currentTeamRelation)
  public currentTeamRelationId!: IDType;

  @Field(_type => Team)
  public team!: Promise<Team>;

  @OneToMany(
    _type => Presenter,
    (presenter: Presenter) => presenter.user,
    { nullable: true }
  )
  public presenters?: Promise<Presenter[]>;

  @Field(_type => Presenter)
  public presenter!: Promise<Presenter>;

  @Field(_type => [EWebinar], {
    description: "Webinars I've been assigned to as moderator",
    nullable: true,
  })
  @OneToMany(
    _type => EWebinarSet,
    (set: EWebinarSet) => set.moderator,
    { nullable: true }
  )
  public assignedSets?: Promise<EWebinarSet[]>;

  @Field()
  @VersionColumn()
  public version!: number;

  @Field()
  @CreateDateColumn()
  public createdAt!: Date;

  @Field()
  @UpdateDateColumn()
  public updatedAt!: Date;

  @Field({ nullable: true })
  @Column({ nullable: true })
  public profileMediaUrl?: string;

  @Field()
  @Column({ unique: true })
  public email!: string;

  @Column({ type: 'varchar', nullable: true })
  public confirmationInvite?: string | null;

  @Field({ nullable: false })
  @Column({ nullable: false })
  public firstName!: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  public lastName?: string;

  @Field({ description: 'First + Last name' })
  public name!: string;

  @Field({ nullable: false })
  @Column({ nullable: false, default: 'America/New_York' })
  public timezone!: string;

  @Field({ nullable: true })
  @Column({ nullable: true, default: null })
  public password?: string;

  @Field(_type => UserState)
  @Column({ type: 'enum', enum: UserState, default: UserState.New })
  public state!: UserState;

  @Field({ nullable: true })
  @Column({ nullable: false, default: false })
  public isVerified?: boolean;

  @OneToMany(
    _type => Message,
    message => message.set
  )
  public messages?: Promise<Message[]>;
}

@ObjectType()
export class Me extends User {
  @Field(_type => AccessTokens)
  public tokens!: AccessTokens;
}

@InputType()
export class UserInput {
  // } implements Partial<User> {

  // User fields
  @Field({ nullable: true })
  public profileMediaUrl?: string;

  @Field()
  public firstName!: string;

  @Field()
  public lastName!: string;

  @Field()
  @IsEmail()
  public email!: string;

  @Field(_type => UserRole, { nullable: true })
  public role?: UserRole;
}

@InputType()
export class NewUserInput extends UserInput {
  @Field({ nullable: true })
  @IsValidPassword()
  public password?: string;
}

@InputType({ description: 'Change password' })
export class ChangePasswordInput implements Partial<User> {
  @Field()
  public token!: string;

  @Field()
  @IsEmail()
  public email!: string;

  @Field()
  @IsValidPassword()
  public password!: string;
}

@InputType({ description: 'Create new user & new team' })
export class NewUserAndTeamInput extends NewUserInput {
  @Field(_type => TeamInput)
  public team!: TeamInput;
}

@InputType({ description: 'Update user or me' })
export class UpdateUserAndTeamInput {
  // implements Partial<User> {

  @Field({ nullable: true })
  public id?: IDType;

  // User fields
  @Field({ nullable: true })
  @IsUrl()
  public profileMediaUrl?: string;

  @Field({ nullable: true })
  @IsNotEmpty()
  public firstName?: string;

  @Field({ nullable: true })
  @IsNotEmpty()
  public lastName?: string;

  @Field({ nullable: true })
  public timezone?: string;

  @Field({ nullable: true })
  public role?: UserRole;

  @Field(_type => TeamInput, { nullable: true })
  public team?: TeamInput;

  /*
   * DD: BUGGGGGGG in TypeORM.  For some reason if @IsEmailAlreadyExit() is on this property
   * I get this error in the UserRepository:
   *
   * Custom entity repository UserRepository  cannot inherit Repository class without entity
   * being set in the @EntityRepository decorator.
   */
  @Field()
  @IsEmail()
  public email!: string;

  @Field({ nullable: true })
  @IsValidPassword()
  public password?: string;
}

@ObjectType()
export class SocketUserResponse implements Partial<User> {
  @Field()
  public readonly id!: IDType;

  @Field({ nullable: true })
  public profileMediaUrl?: string;

  @Field({ nullable: false })
  public firstName!: string;

  @Field({ nullable: true })
  public lastName?: string;
}

@InputType({ description: 'Update User input' })
export class UserAndPresenterInput extends UserInput {
  @Field({ nullable: true })
  public id?: IDType;

  @Field({ nullable: true })
  public phone?: string;

  @Field({ nullable: true })
  public company?: string;

  @Field({ nullable: true })
  public title?: string;

  @Field({ nullable: true })
  public bio?: string;

  @Field(_type => SocialLink, { nullable: true })
  public socialLinks?: SocialLink;

  @Field({ nullable: true })
  public presenterId?: IDType;
}

@InputType()
export class UserFilters {
  @Field(_type => UserOrderByFields, { nullable: true })
  public orderBy?: UserOrderByFields;

  @Field(_type => OrderDirection, { nullable: true })
  public orderDirection?: OrderDirection;
}

@ObjectType()
export class PublicInviter implements Partial<User> {
  @Field()
  public readonly id!: IDType;

  @Field({ nullable: true })
  public profileMediaUrl?: string;

  @Field({ nullable: false })
  public firstName!: string;

  @Field({ nullable: true })
  public lastName?: string;
}

@ObjectType()
export class PublicInvitedUser implements Partial<User> {
  @Field()
  public readonly id!: IDType;

  @Field({ nullable: false })
  public firstName!: string;

  @Field({ nullable: true })
  public lastName?: string;

  @Field(_type => UserRole, { nullable: true })
  public role?: UserRole;

  @Field({ nullable: false })
  public teamId!: IDType;

  @Field(_type => PublicInviter, { nullable: true })
  public invitedByUser?: PublicInviter;
}

@ObjectType()
export class UserInTeam extends User {
  @Field(_type => UserRole)
  public role!: UserRole;

  @Field(_type => InvitationStatus, { nullable: true })
  public invitationStatus?: InvitationStatus;
}
