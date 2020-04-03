import { Field, ObjectType } from 'type-graphql';
import { Attendance } from './Attendance';
import { ChartPoint } from './ChartPoint';
import { Engagement } from './Engagement';
import { OpenRate } from './OpenRate';
import { RegistrationRate } from './RegistrationRate';

@ObjectType()
export class Analytics {
  @Field({ nullable: true })
  public registrationRate?: RegistrationRate;

  @Field({ nullable: true })
  public openRate?: OpenRate;

  @Field({ nullable: true })
  public attendance?: Attendance;

  @Field({ nullable: true })
  public engagement?: Engagement;

  @Field(_type => [ChartPoint], { nullable: true })
  public chartData?: ChartPoint[];
}
