import { registerEnumType, InputType, Field } from 'type-graphql';
import { IDType } from '../../types/IDType';

export enum DashboardFilterEngagement {
  Registered = 'Registered',
  Attended = 'Attended',
  DidNotAttend = 'DidNotAttend',
  LeftEarly = 'LeftEarly',
  WatchedUntilEnd = 'WatchedUntilEnd',
  Interacted = 'Interacted',
  WatchedReplay = 'WatchedReplay',
}

registerEnumType(DashboardFilterEngagement, {
  name: 'DashboardFilterEngagement',
  description: 'Dashboard Filter Engagement',
});

@InputType({ description: 'Get registrants input' })
export class DashboardFilterInput {
  @Field()
  public ewebinarSetId!: IDType;

  @Field({ nullable: true })
  public sessionStartDate?: string;

  @Field({ nullable: true })
  public sessionEndDate?: string;

  @Field(_type => DashboardFilterEngagement, { nullable: true })
  public engagement?: DashboardFilterEngagement;
}
