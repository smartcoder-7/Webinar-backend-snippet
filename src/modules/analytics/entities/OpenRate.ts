import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class OpenRate {
  @Field({ nullable: true })
  public ratePercent?: number;

  @Field({ nullable: true })
  public notificationSent?: number;

  @Field({ nullable: true })
  public notificationOpened?: number;
}
