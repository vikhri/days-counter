import { yearOf } from './dates'
import type { CalendarDate, DateRange } from './types'

export type PeriodChoice = { kind: 'year'; year: number } | { kind: 'custom'; start: CalendarDate; end: CalendarDate }

/** Годы на выбор: текущий и два прошлых, текущий первым. Остальное — через произвольный период. */
export function recentYears(today: CalendarDate): number[] {
  const year = yearOf(today)
  return [year, year - 1, year - 2]
}

export function calendarYear(year: number): DateRange {
  return { start: `${year}-01-01`, end: `${year}-12-31` }
}

/** Текущий год — по сегодня: будущие дни считаются только в произвольном периоде. */
export function resolvePeriod(period: PeriodChoice, today: CalendarDate): DateRange {
  switch (period.kind) {
    case 'year':
      return period.year === yearOf(today) ? { start: `${period.year}-01-01`, end: today } : calendarYear(period.year)
    case 'custom':
      return { start: period.start, end: period.end }
  }
}
