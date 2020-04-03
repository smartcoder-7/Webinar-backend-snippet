import { Response } from 'express';
import stringify from 'csv-stringify';
import moment from 'moment';
import {
  GetRegistrantsInput,
  GetRegistrantsOrderBy,
  ReactionForAttendee,
} from '../../modules/attendee/entities/Attendee';
import { AttendeeRepository } from '../../modules/attendee/AttendeeRepository';
import { UserRepository } from '../../modules/user/UserRepository';
import { EWebinarSetRepository } from '../../modules/ewebinarSet/EWebinarSetRepository';
import { getCustomRepository } from 'typeorm';
import { normalizeFromDate, normalizeToDate } from '../../utils/date';
import { OrderDirection } from '../../utils/pagination';
import { DashboardFilterEngagement } from '../../modules/shared/dashboard';
import { InteractionRepository } from '../../modules/interaction/InteractionRepository';
import { Interaction, InteractionType } from '../../modules/interaction/entities/Interaction';

type PollAnswerKey = 'answer1' | 'answer2' | 'answer3' | 'answer4';
interface ResponseColumnHeader {
  key: string;
  header: string;
}
interface ResponseColumnValue {
  [key: string]: string | undefined;
}

const getResponseColumns = (interaction?: Interaction): ResponseColumnHeader[] => {
  if (!interaction) {
    return [];
  }
  switch (interaction.type) {
    case InteractionType.RequestToContact:
      return [
        { key: 'responseEmail', header: 'Response Email' },
        { key: 'responsePhone', header: 'Response Phone' },
        { key: 'responseContactTime', header: 'Response Contact Time' },
      ];
    case InteractionType.Question:
    case InteractionType.Poll:
    case InteractionType.Feedback:
      return [{ key: 'response', header: 'Response' }];
    default:
      return [];
  }
};

const getResponseColumnValue = (
  record: ReactionForAttendee,
  interaction?: Interaction
): ResponseColumnValue => {
  if (!interaction) {
    return {};
  }
  switch (interaction.type) {
    case InteractionType.RequestToContact:
      if (
        !record.reaction ||
        !record.reaction.detailsFields ||
        !record.reaction.detailsFields.requestToContact
      ) {
        return {};
      }
      return {
        responseEmail: record.reaction.detailsFields.requestToContact.email,
        responsePhone: record.reaction.detailsFields.requestToContact.phone,
        responseContactTime: record.reaction.detailsFields.requestToContact.contactTime,
      };
    case InteractionType.Question:
      return {
        response:
          record.reaction && record.reaction.detailsFields && record.reaction.detailsFields.question
            ? record.reaction.detailsFields.question.answer
            : '',
      };
    case InteractionType.Poll:
      const answerKey: PollAnswerKey = record.reaction!.pollAnswer as PollAnswerKey;
      return {
        response: interaction.details ? interaction.details[answerKey] : '',
      };
    case InteractionType.Feedback:
      return {
        response:
          record.reaction && record.reaction.feedbackRating
            ? record.reaction.feedbackRating.toString()
            : '',
      };
    default:
      return {};
  }
};

const getCsvDataFromRegistrants = (records: ReactionForAttendee[], interaction?: Interaction) => {
  return records.map((record: ReactionForAttendee) => ({
    ...getResponseColumnValue(record, interaction),
    firstName: record.firstName,
    lastName: record.lastName,
    email: record.email,
    registeredDate: moment(record.registeredDate).format('MM/DD/YYYY HH:MM'),
    startTime: moment(record.startTime).format('MM/DD/YYYY HH:MM'),
    watchedPercent: `${record.watchedPercent}%`,
    watchedReplayPercent: `${record.watchedReplayPercent}%`,
  }));
};

const getRegistrantsCsvFilter = (req: any): GetRegistrantsInput => {
  const { ewebinarSetId } = req.params;
  const filter: GetRegistrantsInput = {
    ewebinarSetId,
    orderBy: GetRegistrantsOrderBy.RegisteredDate,
    orderDirection: OrderDirection.Asc,
    engagement: DashboardFilterEngagement.Registered,
  };
  return {
    ...filter,
    ...(JSON.parse(req.query.filter) as GetRegistrantsInput),
  };
};

export const getRegistrantsCsv = async (req: any, res: Response) => {
  const { ewebinarSetId } = req.params;
  try {
    const filter = getRegistrantsCsvFilter(req);
    const attendeeRepository = getCustomRepository(AttendeeRepository);
    const interactionRepository = getCustomRepository(InteractionRepository);
    const userRepository = getCustomRepository(UserRepository);
    const ewebinarSetRepository = getCustomRepository(EWebinarSetRepository);
    const ewebinarSet = await ewebinarSetRepository.publicFindInTeamOneOrFail(ewebinarSetId, req);
    const user = await userRepository.findOneOrFail(req.userId);
    const fromDateUTC = normalizeFromDate(filter && filter.sessionStartDate, user.timezone);
    const toDateUTC = normalizeToDate(filter && filter.sessionEndDate, user.timezone);
    const registrants = await attendeeRepository.allRegistrants(
      ewebinarSet,
      filter,
      fromDateUTC,
      toDateUTC
    );
    let interaction: Interaction | undefined;
    if (filter.interactionId) {
      interaction = await interactionRepository.findInEWebinarOrFail(filter.interactionId, req);
    }
    stringify(
      getCsvDataFromRegistrants(registrants, interaction),
      {
        header: true,
        columns: [
          ...getResponseColumns(interaction),
          { key: 'firstName', header: 'First Name' },
          { key: 'lastName', header: 'Last Name' },
          { key: 'email', header: 'Email' },
          { key: 'registeredDate', header: 'Registered Date' },
          { key: 'startTime', header: 'Session Date' },
          { key: 'watchedPercent', header: 'Watched Percent %' },
          { key: 'watchedReplayPercent', header: 'Watched Replay Percent %' },
        ],
      },
      (_err: any, data: any) => {
        res.setHeader('Content-disposition', 'attachment; filename=registrants.csv');
        res.set('Content-Type', 'text/csv');
        res.status(200).send(data);
      }
    );
  } catch (error) {
    console.log(error);
    res.sendStatus(400);
  }
};
