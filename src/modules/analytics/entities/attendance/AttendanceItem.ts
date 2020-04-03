import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class AttendanceItem {
  @Field()
  public attended!: number;

  @Field()
  public stayedToEnd!: number;

  @Field()
  public leftEarly!: number;

  @Field()
  public averagePercentWatched!: number;
}
