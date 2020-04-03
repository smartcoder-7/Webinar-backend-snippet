import { Field, ID, ObjectType, registerEnumType } from 'type-graphql';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  RelationId,
} from 'typeorm';

import { Team } from './Team';
import { User } from '../../user/entities/User';
import { IDType } from '../../../types/IDType';

export enum UserRole {
  Ops = 'Ops',
  Admin = 'Admin',
  Creator = 'Creator',
  Moderator = 'Moderator',
}

// tslint:disable-next-line:variable-name
export const CreatorRoles = [UserRole.Ops, UserRole.Admin, UserRole.Creator];
// tslint:disable-next-line:variable-name
export const AdminRoles = [UserRole.Ops, UserRole.Admin];

registerEnumType(UserRole, {
  name: 'UserRole',
  description: 'User Authorization Roles',
});

export enum InvitationStatus {
  Pending = 'Pending',
  Accepted = 'Accepted',
  Rejected = 'Rejected',
}

registerEnumType(InvitationStatus, {
  name: 'InvitationStatus',
  description: 'The invite status',
});

@ObjectType()
@Entity()
@Unique(['team', 'user', 'role'])
export class TeamUserRelation {
  @Field(_type => ID)
  @PrimaryGeneratedColumn()
  public readonly id!: IDType;

  @Field(_type => Team)
  @ManyToOne(
    _type => Team,
    team => team.userRelations
  )
  @JoinColumn()
  public team!: Promise<Team>;

  @RelationId((teamUserRelation: TeamUserRelation) => teamUserRelation.team)
  public teamId!: IDType;

  @Field(_type => User)
  @ManyToOne(
    _type => User,
    user => user.teamRelations
  )
  public user!: Promise<User>;

  @RelationId((teamUserRelation: TeamUserRelation) => teamUserRelation.user)
  public userId!: IDType;

  @Field(_type => User, { nullable: true })
  @ManyToOne(_type => User, { nullable: true })
  public invitedByUser?: Promise<User | null>;

  @RelationId((teamUserRelation: TeamUserRelation) => teamUserRelation.invitedByUser)
  public invitedByUserId?: IDType;

  @Field()
  @Column({ type: 'enum', enum: UserRole, default: UserRole.Admin })
  public role!: UserRole;

  @Field(_type => InvitationStatus, { nullable: true })
  @Column({ type: 'enum', enum: InvitationStatus, nullable: true })
  public invitationStatus?: InvitationStatus;

  @Column({ type: 'varchar', nullable: true })
  public teamInvite?: string | null;
}
