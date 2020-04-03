import { RoomType } from '../constant/enum';
import { EWebinar } from '../modules/ewebinar/entities/EWebinar';
import { Reaction } from '../modules/reaction/entities/Reaction';
import { Attendee } from '../modules/attendee/entities/Attendee';

export const getAppearTimeInPresentationRoom = (reaction: Reaction, ewebinar: EWebinar): number => {
  switch (reaction.reactionAppearRoom) {
    case RoomType.Waiting:
      return 0;
    case RoomType.Presentation:
      return reaction.reactionAppearAt;
    case RoomType.Exit:
      return ewebinar.duration!;
  }
};

export const getReactionAppearRoom = (reactionAppearAt: number, ewebinar: EWebinar): RoomType => {
  const { duration } = ewebinar;
  if (reactionAppearAt < 0) {
    return RoomType.Waiting;
  }
  if (reactionAppearAt < duration!) {
    return RoomType.Presentation;
  }
  return RoomType.Exit;
};

export const isReplay = (attendee: Attendee, ewebinar: EWebinar): boolean => {
  return (
    Date.now() >
    attendee.startTime!.getTime() + (ewebinar.duration! + ewebinar.exitRoomDurationSecs) * 1000
  );
};
