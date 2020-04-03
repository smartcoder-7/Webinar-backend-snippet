import { Field, ObjectType } from 'type-graphql';
import { Attendee } from '../../modules/attendee/entities/Attendee';
import injectVariables from './index';
import GraphQLJSON from 'graphql-type-json';

@ObjectType()
export class WelcomeMessageAttendeeVariables {
  @Field()
  public firstName!: string;

  @Field()
  public lastName!: string;

  @Field()
  public name!: string;
}

@ObjectType()
export class WelcomeMessageVariables {
  @Field()
  public firstName!: string;

  @Field()
  public lastName!: string;

  @Field()
  public name!: string;

  @Field(_type => GraphQLJSON)
  public attendee!: WelcomeMessageAttendeeVariables;
}

const injectWelcomeMessage = (welcomeMessage: string, attendee: Attendee) => {
  const attendeeFields = {
    firstName: attendee.firstName,
    lastName: attendee.lastName,
    name: attendee.firstName + ' ' + attendee.lastName,
  };
  const neededAttendeeFields: WelcomeMessageVariables = {
    ...attendeeFields,
    attendee: attendeeFields,
  };
  return injectVariables(welcomeMessage, neededAttendeeFields);
};

export default injectWelcomeMessage;
