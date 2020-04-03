import { Field, ObjectType } from 'type-graphql';
import { AttendanceItem } from './attendance/AttendanceItem';

@ObjectType()
export class Attendance {
  @Field({ nullable: true })
  public ratePercent?: number;

  @Field({ nullable: true })
  public live?: AttendanceItem;

  @Field({ nullable: true })
  public replay?: AttendanceItem;
}
