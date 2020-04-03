import { EWebinar } from '../modules/ewebinar/entities/EWebinar';
import { RoomType } from '../constant/enum';

const timeDuoFromTimeIn = (
  startTime: Date,
  ewebinar: EWebinar,
  timeSent: Date,
  timeInSecs?: number
): [RoomType, number] => {
  const duration = ewebinar.duration!;

  if (!timeInSecs) {
    // Approximate TimeIn for Moderator.  This won't work well in Replay scenarios
    // TODO: Should timeInSecs be optional?  We should definitely not sort by it
    timeInSecs = (timeSent.getTime() - startTime.getTime()) / 1000;
  }

  if (timeInSecs < ewebinar.waitingRoomDurationSecs) {
    return [RoomType.Waiting, timeInSecs];
  }

  if (timeInSecs < ewebinar.waitingRoomDurationSecs + duration) {
    return [RoomType.Presentation, timeInSecs - ewebinar.waitingRoomDurationSecs];
  }

  return [RoomType.Exit, timeInSecs - ewebinar.waitingRoomDurationSecs - duration];
};

export default timeDuoFromTimeIn;
