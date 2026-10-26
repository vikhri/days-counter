import { toDayNumber } from './dates'
import type { CalendarDate, DateRange, Stay } from './types'

/** Число разных дней внутри диапазона, покрытых пребываниями; открытые тянутся до сегодня. */
export function countPresenceDays(stays: Stay[], range: DateRange, today: CalendarDate): number {
  const from = toDayNumber(range.start)
  const to = toDayNumber(range.end)
  const days = new Set<number>()
  for (const s of stays) {
    const last = Math.min(toDayNumber(s.exit ?? today), to)
    for (let day = Math.max(toDayNumber(s.entry), from); day <= last; day++) days.add(day)
  }
  return days.size
}
