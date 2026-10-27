import { yearOf } from './dates'
import { calendarYear, last12Months } from './periods'
import type { CalendarDate, CountryCode, DateRange, Stay } from './types'

/** Период в фильтре пребываний. Годы — целиком, вместе с запланированным. */
export type DateFilter =
  | { kind: 'any' }
  | { kind: 'currentYear' }
  | { kind: 'previousYear' }
  | { kind: 'last12Months' }
  | { kind: 'custom'; start: CalendarDate; end: CalendarDate }

export interface StayFilter {
  /** null — все страны. */
  country: CountryCode | null
  dates: DateFilter
}

/** Диапазон дат фильтра; null — любые даты. */
export function resolveDateFilter(filter: DateFilter, today: CalendarDate): DateRange | null {
  switch (filter.kind) {
    case 'any':
      return null
    case 'currentYear':
      return calendarYear(yearOf(today))
    case 'previousYear':
      return calendarYear(yearOf(today) - 1)
    case 'last12Months':
      return last12Months(today)
    case 'custom':
      return { start: filter.start, end: filter.end }
  }
}

/** Пребывание попадает в период, если пересекается с ним; открытое тянется до сегодня. */
export function filterStays(stays: Stay[], filter: StayFilter, today: CalendarDate): Stay[] {
  const range = resolveDateFilter(filter.dates, today)
  return stays.filter(
    (stay) =>
      (filter.country === null || stay.country === filter.country) &&
      (range === null || (stay.entry <= range.end && (stay.exit ?? today) >= range.start)),
  )
}
