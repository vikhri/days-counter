import { fromDayNumber, toDayNumber } from './dates'
import { resolvePeriod, type PeriodChoice } from './periods'
import type { CalendarDate, CountryCode, DateRange, Stay } from './types'

export type { PeriodChoice }

export interface CountryDays {
  country: CountryCode
  /** Все дни в стране за период, включая будущие. */
  days: number
  futureDays: number
}

export interface DayCount {
  range: DateRange
  countries: CountryDays[]
  unspecifiedDays: number
  /** Самый длинный отрезок неуказанных дней периода; при равной длине — более ранний. null — неуказанных нет. */
  longestGap: DateRange | null
}

export function countDays(stays: Stay[], period: PeriodChoice, today: CalendarDate): DayCount {
  const range = resolvePeriod(period, today, stays)
  const from = toDayNumber(range.start)
  const to = toDayNumber(range.end)
  const todayNumber = toDayNumber(today)

  const daysByCountry = new Map<CountryCode, Set<number>>()
  const covered = new Set<number>()
  for (const s of stays) {
    const first = Math.max(toDayNumber(s.entry), from)
    const last = Math.min(toDayNumber(s.exit ?? today), to)
    for (let day = first; day <= last; day++) {
      let set = daysByCountry.get(s.country)
      if (!set) daysByCountry.set(s.country, (set = new Set()))
      set.add(day)
      covered.add(day)
    }
  }

  const countries = [...daysByCountry]
    .map(([country, days]) => ({
      country,
      days: days.size,
      futureDays: [...days].filter((day) => day > todayNumber).length,
    }))
    .sort((a, b) => b.days - a.days || a.country.localeCompare(b.country))
  return { range, countries, unspecifiedDays: to - from + 1 - covered.size, longestGap: longestGap(covered, from, to) }
}

function longestGap(covered: Set<number>, from: number, to: number): DateRange | null {
  let best: { first: number; last: number } | null = null
  let runStart = from
  for (let day = from; day <= to + 1; day++) {
    if (day <= to && !covered.has(day)) continue
    if (day > runStart && (!best || day - runStart > best.last - best.first + 1)) best = { first: runStart, last: day - 1 }
    runStart = day + 1
  }
  return best && { start: fromDayNumber(best.first), end: fromDayNumber(best.last) }
}
