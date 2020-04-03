import moment from 'moment';

const MYSQL_DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

export const toMySQLDateString = (date: Date): string => {
  return new Date(date.getTime() - new Date().getTimezoneOffset() * 60 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ');
};

export const isValidDate = (dateStr: string) => {
  const date = moment(dateStr);
  return date.isValid();
};

const createMomentDateWithTz = (dateStr: string, timezone?: string): moment.Moment => {
  if (!timezone) {
    timezone = 'UTC';
  }
  const date = moment.tz(dateStr, timezone);
  return date;
};

export const normalizeFromDate = (dateStr?: string, timezone?: string): string | undefined => {
  if (!dateStr || !isValidDate(dateStr)) {
    return undefined;
  }
  const date = createMomentDateWithTz(dateStr, timezone);
  // Convert User timezone to UTC (DB timezone is UTC)
  return date
    .hours(0)
    .minutes(0)
    .seconds(0)
    .tz('UTC')
    .format(MYSQL_DATE_TIME_FORMAT);
};

export const normalizeToDate = (dateStr?: string, timezone?: string): string | undefined => {
  if (!dateStr || !isValidDate(dateStr)) {
    return undefined;
  }
  const date = createMomentDateWithTz(dateStr, timezone);
  // Convert User timezone to UTC (DB timezone is UTC)
  return date
    .hours(23)
    .minutes(59)
    .seconds(59)
    .tz('UTC')
    .format(MYSQL_DATE_TIME_FORMAT);
};
