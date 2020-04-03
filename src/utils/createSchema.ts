import { GraphQLSchema } from 'graphql';
import { buildSchema } from 'type-graphql';
import { myAuthChecker } from '../middleware/MyAuthChecker';
import { ConversationResolver } from '../modules/chat/resolvers/ConversationResolver';
import { AttendeeResolvers } from '../modules/attendee/resolvers/AttendeeResolvers';
import { InteractionResolvers } from '../modules/interaction/resolvers/InteractionResolvers';
import { NotificationsResolver } from '../modules/notification/resolvers/NotificationsResolver';
import { LoginResolvers } from '../modules/user/resolvers/LoginResolvers';
import { VideoScraperResolver } from '../modules/assets/VideoScraperResolver';
import { VimeoVideoResolvers } from '../modules/assets/VimeoVideoResolvers';
import { AssetsResolver } from '../modules/assets/AssetsResolver';
import { UserResolver } from '../modules/user/resolvers/UserResolver';
import { EWebinarResolver } from '../modules/ewebinar/resolvers/EWebinarResolver';
import { EWebinarSetResolver } from '../modules/ewebinarSet/resolvers/EWebinarSetResolver';
import { AnalyticsResolvers } from '../modules/analytics/resolvers/AnalyticsResolvers';
import { MeResolver } from '../modules/user/resolvers/MeResolvers';
import { PresenterResolver } from '../modules/presenter/resolvers/PresenterResolver';
import { EWebinarFieldResolvers } from '../modules/ewebinar/resolvers/EWebinarFieldResolvers';
import { TeamResolver } from '../modules/team/resolvers/TeamResolver';
import { MessageResolver } from '../modules/chat/resolvers/MessageResolver';
import { ReactionResolver } from '../modules/reaction/resolvers/reactionResolvers';
import { EwebinarSessionResolvers } from '../modules/ewebinar/resolvers/EwebinarSessionResolvers';
import { EWebinarSetFieldResolvers } from '../modules/ewebinarSet/resolvers/EWebinarSetFieldResolvers';

export const createSchema = (container: any): Promise<GraphQLSchema> => {
  return buildSchema({
    container,
    resolvers: [
      EWebinarResolver,
      EWebinarFieldResolvers,
      EWebinarSetResolver,
      AssetsResolver,
      NotificationsResolver,
      InteractionResolvers,
      AttendeeResolvers,
      MessageResolver,
      ConversationResolver,
      TeamResolver,
      VimeoVideoResolvers,
      VideoScraperResolver,
      UserResolver,
      PresenterResolver,
      MeResolver,
      LoginResolvers,
      AnalyticsResolvers,
      ReactionResolver,
      EwebinarSessionResolvers,
      EWebinarSetFieldResolvers,
    ],
    authChecker: myAuthChecker,
    emitSchemaFile: {
      path: __dirname + '/../schema.gql',
      commentDescriptions: true,
    },
  });
};
