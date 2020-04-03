import { ChartPoint } from '../modules/analytics/entities/ChartPoint';
import { EWebinar } from '../modules/ewebinar/entities/EWebinar';

interface ChartPointMap {
  [key: string]: ChartPoint;
}

export const groupChartPoints = (chartPoints: ChartPoint[], ewebinar: EWebinar): ChartPoint[] => {
  const from = -ewebinar.waitingRoomDurationSecs;
  const to = ewebinar.duration! + ewebinar.exitRoomDurationSecs;
  const results: ChartPointMap = chartPoints.reduce(
    (chartDatas: ChartPointMap, current: ChartPoint): ChartPointMap => {
      if (current.timeFrame < from || current.timeFrame > to) {
        return chartDatas;
      }
      return {
        ...chartDatas,
        [current.timeFrame]: {
          liveAttendance: 0,
          replayWatched: 0,
          interactions: 0,
          reactions: 0,
          ...(chartDatas[current.timeFrame] || {}),
          ...current,
        },
      };
    },
    {
      [from]: {
        timeFrame: from,
        liveAttendance: 0,
        replayWatched: 0,
        interactions: 0,
        reactions: 0,
      },
      [to]: {
        timeFrame: to,
        liveAttendance: 0,
        replayWatched: 0,
        interactions: 0,
        reactions: 0,
      },
    }
  );
  return Object.values(results).sort((a: ChartPoint, b: ChartPoint) => {
    return a.timeFrame - b.timeFrame;
  });
};
