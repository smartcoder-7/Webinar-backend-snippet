import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class ChartPoint {
  @Field()
  public timeFrame!: number;

  @Field({ nullable: true })
  public liveAttendance?: number;

  @Field({ nullable: true })
  public replayWatched?: number;

  @Field({ nullable: true })
  public interactions?: number;

  @Field({ nullable: true })
  public reactions?: number;
}
