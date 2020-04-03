import { Arg, Query, Resolver, Ctx } from 'type-graphql';
import { InjectRepository } from 'typeorm-typedi-extensions';
import { Attendee } from '../../attendee/entities/Attendee';
import { Analytics } from '../entities/Analytics';
import { AttendeeRepository } from '../../attendee/AttendeeRepository';
import { DashboardFilterInput } from '../../shared/dashboard';
import { MyContext } from '../../../types/MyContext';
import { normalizeFromDate, normalizeToDate } from '../../../utils/date';
import { User } from '../../user/entities/User';
import { UserRepository } from '../../user/UserRepository';
import { Reaction } from '../../reaction/entities/Reaction';
import { ReactionRepository } from '../../reaction/ReactionRepository';
import { Interaction } from '../../interaction/entities/Interaction';
import { InteractionRepository } from '../../interaction/InteractionRepository';
import { groupChartPoints } from '../../../utils/analytics';
import { EWebinarSet } from '../../ewebinarSet/entities/EWebinarSet';
import { EWebinarSetRepository } from '../../ewebinarSet/EWebinarSetRepository';
import { ApolloError } from 'apollo-server-express';
import { Message } from '../../chat/entities/Message';
import { MessageRepository } from '../../chat/MessageRepository';

@Resolver(_of => Analytics)
export class AnalyticsResolvers {
  constructor(
    @InjectRepository(Attendee)
    private readonly attendeeRepository: AttendeeRepository,
    @InjectRepository(Reaction)
    private readonly reactionRepository: ReactionRepository,
    @InjectRepository(User)
    private readonly userRepository: UserRepository,
    @InjectRepository(Interaction)
    private readonly interactionRepository: InteractionRepository,
    @InjectRepository(EWebinarSet)
    private readonly eWebinarSetRepository: EWebinarSetRepository,
    @InjectRepository(Message)
    private readonly messageRepository: MessageRepository
  ) {}

  @Query(_type => Analytics, { nullable: true })
  public async analytics(
    @Arg('filter', { nullable: true, validate: true })
    filter: DashboardFilterInput,
    @Ctx() ctx: MyContext
  ): Promise<Analytics> {
    const ewebinarSet = await this.eWebinarSetRepository.findInTeamOneOrFail(
      filter.ewebinarSetId,
      ctx.req
    );
    const ewebinar = await ewebinarSet.publicWebinar;
    if (!ewebinar) {
      throw new ApolloError(`Entity not found`, 'NOT_FOUND');
    }
    const user = await this.userRepository.findOneOrFail(ctx.req.userId);
    const fromDateUTC = normalizeFromDate(filter.sessionStartDate, user.timezone);
    const toDateUTC = normalizeToDate(filter.sessionEndDate, user.timezone);
    const attendance = await this.attendeeRepository.getAttendance(
      filter.ewebinarSetId,
      filter,
      fromDateUTC,
      toDateUTC
    );
    const attendanceChartPoints = await this.reactionRepository.getAttendanceCountByTimeframe(
      filter.ewebinarSetId,
      fromDateUTC,
      toDateUTC
    );
    const interactedChartPoints = await this.reactionRepository.getInteractedReactionCountByTimeframe(
      filter.ewebinarSetId,
      fromDateUTC,
      toDateUTC
    );
    const interactionChartPoints = await this.interactionRepository.getInteractionCountByTimeframe(
      filter.ewebinarSetId
    );
    const totalInteractions = await this.interactionRepository.countInEWebinarSetAllOrFail(
      filter.ewebinarSetId
    );
    const totalMessages = await this.messageRepository.countMessageInEwebinarSet(
      filter.ewebinarSetId,
      fromDateUTC,
      toDateUTC
    );
    const uniqueVisitors = await this.attendeeRepository.getUniqueVisitor(
      filter.ewebinarSetId,
      fromDateUTC,
      toDateUTC
    );
    const registered = await this.attendeeRepository.getRegistered(
      filter.ewebinarSetId,
      fromDateUTC,
      toDateUTC
    );
    await this.reactionRepository.getInteractedReactionCountByTimeframe(
      filter.ewebinarSetId,
      fromDateUTC,
      toDateUTC
    );
    const ratePercent =
      uniqueVisitors !== 0 ? Math.ceil((registered / uniqueVisitors) * 10000) / 100 : 0;
    const engagement = await this.reactionRepository.countEngagementAnalytics(
      filter.ewebinarSetId,
      filter.engagement,
      fromDateUTC,
      toDateUTC
    );
    const engagementPercent = await this.attendeeRepository.getEngagementPercent(
      filter.ewebinarSetId,
      fromDateUTC,
      toDateUTC
    );
    return {
      attendance,
      engagement: {
        ...engagement,
        totalInteractions,
        engagementPercent,
        chatMessages: totalMessages,
      },
      registrationRate: {
        uniqueVisitors,
        registered,
        ratePercent,
      },
      chartData: groupChartPoints(
        [...attendanceChartPoints, ...interactedChartPoints, ...interactionChartPoints],
        ewebinar
      ),
    };
  }
}
