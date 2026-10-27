import { fromDayNumber, toDayNumber } from './dates'
import type { CalendarDate, CountryCode, Stay } from './types'

export interface YearSegment {
  /** null — неуказанные дни. */
  country: CountryCode | null
  start: CalendarDate
  end: CalendarDate
  days: number
  /** Дни позже сегодня — план. */
  future: boolean
}

/**
 * Календарный год отрезками подряд, каждый день ровно в одном отрезке.
 * День стыка отдан стране въезда, поэтому дни отрезков в сумме дают длину года.
 */
export function yearTimeline(stays: Stay[], year: number, today: CalendarDate): YearSegment[] {
  const from = toDayNumber(`${year}-01-01`)
  const to = toDayNumber(`${year}-12-31`)
  const todayNumber = toDayNumber(today)

  const owner: (CountryCode | null)[] = new Array<CountryCode | null>(to - from + 1).fill(null)
  for (const s of [...stays].sort((a, b) => a.entry.localeCompare(b.entry))) {
    const last = Math.min(toDayNumber(s.exit ?? today), to)
    for (let day = Math.max(toDayNumber(s.entry), from); day <= last; day++) owner[day - from] = s.country
  }

  const segments: YearSegment[] = []
  let segmentStart = from
  for (let day = from; day <= to; day++) {
    const next = day + 1
    const boundary =
      next > to || owner[next - from] !== owner[day - from] || (day <= todayNumber) !== (next <= todayNumber)
    if (!boundary) continue
    segments.push({
      country: owner[day - from] ?? null,
      start: fromDayNumber(segmentStart),
      end: fromDayNumber(day),
      days: day - segmentStart + 1,
      future: day > todayNumber,
    })
    segmentStart = next
  }
  return segments
}
