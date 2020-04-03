import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class RegistrationRate {
  @Field({ nullable: true })
  public ratePercent?: number;

  @Field({ nullable: true })
  public uniqueVisitors?: number;

  @Field({ nullable: true })
  public registered?: number;
}
