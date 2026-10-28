import { addDays, isWeekend, format, parseISO, differenceInHours } from 'date-fns';

export interface WorkingDayConfig {
  holidays?: string[]; // YYYY-MM-DD
  businessHourStart?: number; // e.g. 9
  businessHourEnd?: number;   // e.g. 17
}

/**
 * Checks whether a given Date is a non-working day (weekend or client holiday)
 */
export function isNonWorkingDay(date: Date, holidays: string[] = []): boolean {
  if (isWeekend(date)) {
    return true;
  }
  const dateStr = format(date, 'yyyy-MM-dd');
  return holidays.includes(dateStr);
}

/**
 * Calculates total elapsed working hours between start and end date,
 * excluding weekends and specified holiday dates.
 */
export function calculateWorkingHours(
  startDate: Date,
  endDate: Date,
  config: WorkingDayConfig = {}
): number {
  if (endDate <= startDate) {
    return 0;
  }

  const holidays = config.holidays || [];
  const startHour = config.businessHourStart ?? 9;
  const endHour = config.businessHourEnd ?? 17;
  const dailyWorkHours = Math.max(0, endHour - startHour);

  let current = new Date(startDate.getTime());
  let totalHours = 0;

  // If start and end are on the same calendar day
  const isSameDay = format(startDate, 'yyyy-MM-dd') === format(endDate, 'yyyy-MM-dd');
  if (isSameDay) {
    if (isNonWorkingDay(startDate, holidays)) {
      return 0;
    }
    const currentStartHour = Math.max(startHour, Math.min(endHour, startDate.getHours() + startDate.getMinutes() / 60));
    const currentEndHour = Math.max(startHour, Math.min(endHour, endDate.getHours() + endDate.getMinutes() / 60));
    return Math.max(0, currentEndHour - currentStartHour);
  }

  // Iterate day by day
  while (current < endDate) {
    if (!isNonWorkingDay(current, holidays)) {
      const isStartDay = format(current, 'yyyy-MM-dd') === format(startDate, 'yyyy-MM-dd');
      const isEndDay = format(current, 'yyyy-MM-dd') === format(endDate, 'yyyy-MM-dd');

      if (isStartDay) {
        const startFraction = Math.max(startHour, Math.min(endHour, startDate.getHours() + startDate.getMinutes() / 60));
        totalHours += Math.max(0, endHour - startFraction);
      } else if (isEndDay) {
        const endFraction = Math.max(startHour, Math.min(endHour, endDate.getHours() + endDate.getMinutes() / 60));
        totalHours += Math.max(0, endFraction - startHour);
      } else {
        totalHours += dailyWorkHours;
      }
    }
    current = addDays(current, 1);
    current.setHours(startHour, 0, 0, 0);
  }

  return Math.round(totalHours * 100) / 100;
}

/**
 * Calculates calendar hours between two dates (24/7 policy)
 */
export function calculateCalendarHours(startDate: Date, endDate: Date): number {
  if (endDate <= startDate) {
    return 0;
  }
  const diffHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
  return Math.round(diffHours * 100) / 100;
}

/**
 * Adds N working days to a start date, skipping weekends and holidays
 */
export function addWorkingDays(startDate: Date, daysToAdd: number, holidays: string[] = []): Date {
  let date = new Date(startDate.getTime());
  let daysAdded = 0;

  while (daysAdded < daysToAdd) {
    date = addDays(date, 1);
    if (!isNonWorkingDay(date, holidays)) {
      daysAdded++;
    }
  }

  return date;
}
