import { yearOf } from './dates'
import { calendarYear, last12Months } from './periods'
import { countPresenceDays } from './presence'
import type { CalendarDate, Stay } from './types'

/** НК РФ ст. 207 п. 2: не менее 183 календарных дней в течение 12 следующих подряд месяцев. */
export const RESIDENCY_THRESHOLD = 183

export interface ResidencyCount {
  days: number
  resident: boolean
}

export interface RussiaStatus {
  /** С 1 января по сегодня; статус за год окончателен только после 31 декабря. */
  currentYear: ResidencyCount & { year: number }
  /** Промежуточный статус: последние 12 месяцев по сегодня. */
  today: ResidencyCount
  /** Статус за прошлый год — окончательный. */
  previousYear: ResidencyCount & { year: number }
}

export function russiaStatus(stays: Stay[], today: CalendarDate): RussiaStatus {
  const inRussia = stays.filter((s) => s.country === 'RU')
  const count = (start: CalendarDate, end: CalendarDate): ResidencyCount => {
    const days = countPresenceDays(inRussia, { start, end }, today)
    return { days, resident: days >= RESIDENCY_THRESHOLD }
  }

  const year = yearOf(today)
  const window = last12Months(today)
  const previous = calendarYear(year - 1)
  return {
    currentYear: { year, ...count(`${year}-01-01`, today) },
    today: count(window.start, window.end),
    previousYear: { year: year - 1, ...count(previous.start, previous.end) },
  }
}
