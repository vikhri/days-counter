import { addDays, addMonths, yearOf } from './dates'
import type { CalendarDate, DateRange, Stay } from './types'

export type PeriodChoice =
  | { kind: 'currentYear' }
  | { kind: 'last12Months' }
  | { kind: 'previousYear' }
  | { kind: 'allTime' }
  | { kind: 'custom'; start: CalendarDate; end: CalendarDate }

/** Последние 12 календарных месяцев по сегодня включительно. */
export function last12Months(today: CalendarDate): DateRange {
  return { start: addDays(addMonths(today, -12), 1), end: today }
}

export function calendarYear(year: number): DateRange {
  return { start: `${year}-01-01`, end: `${year}-12-31` }
}

export function resolvePeriod(period: PeriodChoice, today: CalendarDate, stays: Stay[]): DateRange {
  switch (period.kind) {
    case 'currentYear':
      return { start: `${yearOf(today)}-01-01`, end: today }
    case 'last12Months':
      return last12Months(today)
    case 'previousYear':
      return calendarYear(yearOf(today) - 1)
    case 'allTime': {
      const earliest = stays.reduce((min, s) => (s.entry < min ? s.entry : min), today)
      return { start: earliest, end: today }
    }
    case 'custom':
      return { start: period.start, end: period.end }
  }
}
