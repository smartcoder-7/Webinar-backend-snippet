import { Field, ObjectType } from 'type-graphql';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { IDType } from '../../../types/IDType';

@ObjectType()
@Entity()
export class Token {
  @Field()
  @PrimaryGeneratedColumn()
  public readonly id!: IDType;

  @Column({ unique: true })
  public token!: string;

  @Column()
  public targetType!: string;

  @Column()
  public targetID!: IDType;

  @Column()
  public expiresAt!: Date;

  @Column()
  public tokenType!: string;
}
