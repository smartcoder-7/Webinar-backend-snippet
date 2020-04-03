import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class EngagementItem {
  @Field({ nullable: true })
  public total?: number;
}
