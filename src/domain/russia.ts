import { addDays, toDayNumber, yearOf } from './dates'
import { countPresenceDays } from './presence'
import type { CalendarDate, Stay } from './types'

/** НК РФ ст. 207 п. 2: не менее 183 календарных дней — резидент. */
export const RESIDENCY_THRESHOLD = 183

export interface PlannedAllowance {
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
  const plannedDays = daysLeftInYear
    ? countPresenceDays(inRussia, { start: addDays(today, 1), end: `${year}-12-31` }, today)
    : 0

  return {
    year,
    days,
    allowance: allowanceFor(days),
    resident,
    unreachable: !resident && days + daysLeftInYear < RESIDENCY_THRESHOLD,
    planned: plannedDays
      ? { allowance: allowanceFor(days + plannedDays), resident: days + plannedDays >= RESIDENCY_THRESHOLD }
      : null,
  }
}
