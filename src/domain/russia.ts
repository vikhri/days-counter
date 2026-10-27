import { addDays, toDayNumber, yearOf } from './dates'
import { countPresenceDays } from './presence'
import type { CalendarDate, Stay } from './types'

/** НК РФ ст. 207 п. 2: не менее 183 календарных дней — резидент. */
export const RESIDENCY_THRESHOLD = 183

export interface PlannedAllowance {
  /** Дни в России за год вместе с будущими. */
  days: number
  /** Последний будущий день в России в этом году — к нему наберутся `days`. */
  until: CalendarDate
  allowance: number
  resident: boolean
}

export interface RussiaStatus {
  year: number
  /** Дни в России с 1 января по сегодня. */
  days: number
  /** Запас дней: сколько ещё можно провести в России в этом году, не став резидентом. */
  allowance: number
  resident: boolean
  /** До конца года порог уже не набрать. */
  unreachable: boolean
  /** Запас с учётом будущих дней в России до 31 декабря; null — таких дней нет. */
  planned: PlannedAllowance | null
}

/** 183-й день делает резидентом, поэтому запас — до 182 включительно. */
const allowanceFor = (days: number) => Math.max(0, RESIDENCY_THRESHOLD - 1 - days)

/** Всё — только за текущий календарный год: цель пользователя — не стать резидентом. */
export function russiaStatus(stays: Stay[], today: CalendarDate): RussiaStatus {
  const inRussia = stays.filter((s) => s.country === 'RU')
  const year = yearOf(today)
  const days = countPresenceDays(inRussia, { start: `${year}-01-01`, end: today }, today)
  const daysLeftInYear = toDayNumber(`${year}-12-31`) - toDayNumber(today)
  const resident = days >= RESIDENCY_THRESHOLD
  const yearEnd = `${year}-12-31`
  const plannedDays = daysLeftInYear ? countPresenceDays(inRussia, { start: addDays(today, 1), end: yearEnd }, today) : 0
  const until = inRussia
    .map((s) => s.exit ?? today)
    .reduce((last, exit) => (exit > last ? exit : last), today)

  return {
    year,
    days,
    allowance: allowanceFor(days),
    resident,
    unreachable: !resident && days + daysLeftInYear < RESIDENCY_THRESHOLD,
    planned: plannedDays
      ? {
          days: days + plannedDays,
          until: until > yearEnd ? yearEnd : until,
          allowance: allowanceFor(days + plannedDays),
          resident: days + plannedDays >= RESIDENCY_THRESHOLD,
        }
      : null,
  }
}
