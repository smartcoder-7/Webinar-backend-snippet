import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class AttendanceCount {
  @Field()
  public timeFrame!: number;

  @Field()
  public joined!: number;

  @Field()
  public left!: number;

  @Field()
  public replayJoined!: number;

  @Field()
  public replayLeft!: number;
}
