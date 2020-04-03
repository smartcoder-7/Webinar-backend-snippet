import { Field, ObjectType } from 'type-graphql';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { IDType } from '../../../types/IDType';
import { ORMObject } from '../../../types/ORMObject';

@ObjectType()
@Entity()
export class LatestNotificationTimestamp extends ORMObject<LatestNotificationTimestamp> {
  @Field()
  @PrimaryGeneratedColumn()
  public readonly id!: IDType;

  @Column()
  public timestamp!: Date;
}
