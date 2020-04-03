import moment = require('moment');
import { getCustomRepository, getRepository, In } from 'typeorm';
import { Reaction, ReactionEventName } from '../../modules/reaction/entities/Reaction';
import { Attendee } from '../../modules/attendee/entities/Attendee';
import { ReactionRepository } from '../../modules/reaction/ReactionRepository';
import { getReactionAppearRoom, getAppearTimeInPresentationRoom, isReplay } from '../../utils/room';
import { LiveChatConnection } from '../../modules/chat/entities/LiveChatConnection';
import { AttendeeRepository } from '../../modules/attendee/AttendeeRepository';
import { IDType } from '../../types/IDType';
import { RoomType } from '../../constant/enum';

const updateWatchedPercent = async (attendee: Attendee, isWatchingReplay: boolean) => {
  const joinedEventName = isWatchingReplay
    ? ReactionEventName.ReplayJoined
    : ReactionEventName.Joined;
  const leftEventName = isWatchingReplay ? ReactionEventName.ReplayLeft : ReactionEventName.Left;
  const updateKey = isWatchingReplay ? 'watchedReplayPercent' : 'watchedPercent';
  const ewebinar = await attendee.ewebinar;
  if (!ewebinar || !ewebinar.duration) {
    return;
  }
  const attendanceReactions = await getCustomRepository(ReactionRepository).find({
    where: {
      attendee,
      eventName: In([joinedEventName, leftEventName]),
    },
    order: {
      reactionAppearAt: 'ASC',
    },
  });

  const [watchedDuration]: [number, number] = attendanceReactions
    .filter(({ eventName }) => eventName === joinedEventName)
    .reduce(
      ([currentWatchedDuration, lastLeftAt], reaction: Reaction) => {
        const leftReaction = attendanceReactions.find(({ eventName, connectionId }) => {
          return eventName === leftEventName && connectionId === reaction.connectionId;
        });
        if (!leftReaction) {
          return [currentWatchedDuration, lastLeftAt];
        }
        const leftAt = getAppearTimeInPresentationRoom(leftReaction, ewebinar);
        const joinedAt = getAppearTimeInPresentationRoom(reaction, ewebinar);
        if (leftAt < lastLeftAt && !isWatchingReplay) {
          return [currentWatchedDuration, lastLeftAt];
        }
        const additionWatchedDuration = isWatchingReplay
          ? leftAt
          : leftAt - (joinedAt > lastLeftAt ? joinedAt : lastLeftAt);
        const nextWatchedDuration = currentWatchedDuration + additionWatchedDuration;
        return [nextWatchedDuration, leftAt];
      },
      [0, 0]
    );
  const updatedPercent = (watchedDuration / ewebinar.duration) * 100;
  attendee[updateKey] = updatedPercent > 100 ? 100 : updatedPercent;
  await attendee.save();
};

export const liveJoin = async (attendee: Attendee, connectionId: IDType) => {
  const ewebinar = await attendee.ewebinar;
  if (ewebinar) {
    const isWatchingReplay = isReplay(attendee, ewebinar);
    const reactionAppearAt = isWatchingReplay ? 0 : moment().diff(attendee.startTime, 'seconds');
    const reactionAppearRoom = isWatchingReplay
      ? RoomType.Presentation
      : getReactionAppearRoom(reactionAppearAt, ewebinar);
    const eventName = isWatchingReplay ? ReactionEventName.ReplayJoined : ReactionEventName.Joined;
    const reaction = new Reaction({
      attendee,
      ewebinar,
      connectionId,
      eventName,
      reactionAppearAt,
      reactionAppearRoom,
      ewebinarSet: await attendee.set,
    });
    await reaction.save();
  }
};

export const liveLeave = async (connectionId: string) => {
  const connectionRepository = getRepository(LiveChatConnection);
  const attendeeRepositoty = getCustomRepository(AttendeeRepository);
  const reactionRepository = getCustomRepository(ReactionRepository);
  const connection = await connectionRepository.findOne(connectionId);
  if (connection && connection.attendeeId) {
    const attendee = await attendeeRepositoty.findOne(connection.attendeeId);
    if (!attendee) {
      return;
    }
    const ewebinar = await attendee.ewebinar;
    if (ewebinar) {
      const isWatchingReplay = isReplay(attendee, ewebinar);
      if (isWatchingReplay) {
        const joinedReaction = await reactionRepository.find({
          attendee,
          ewebinar,
          eventName: ReactionEventName.ReplayJoined,
          connectionId,
        });
        if (!joinedReaction || !joinedReaction[0]) {
          console.error('Can not find joined event! Attendee did not joined');
          return;
        }
        const reactionAppearAt = moment().diff(joinedReaction[0].createdAt, 'seconds');
        const replayLeftReaction = new Reaction({
          attendee,
          ewebinar,
          eventName: ReactionEventName.ReplayLeft,
          ewebinarSet: await attendee.set,
          connectionId,
          reactionAppearAt:
            reactionAppearAt > ewebinar.duration! ? ewebinar.duration : reactionAppearAt,
          reactionAppearRoom: RoomType.Presentation,
        });
        await replayLeftReaction.save();
      } else {
        const reactionAppearAt = moment().diff(attendee.startTime, 'seconds');
        const liveLeftReaction = new Reaction({
          attendee,
          ewebinar,
          eventName: ReactionEventName.Left,
          ewebinarSet: await attendee.set,
          connectionId,
          reactionAppearAt,
          reactionAppearRoom: getReactionAppearRoom(reactionAppearAt, ewebinar),
        });
        await liveLeftReaction.save();
      }
      await updateWatchedPercent(attendee, isWatchingReplay);
    }
  }
};
