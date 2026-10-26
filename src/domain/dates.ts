import type { CalendarDate } from './types'

const MS_PER_DAY = 86_400_000

/** Номер дня от 1970-01-01; удобен для арифметики и сравнения. */
export function toDayNumber(date: CalendarDate): number {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  return Date.UTC(y, m - 1, d) / MS_PER_DAY
}

export function fromDayNumber(day: number): CalendarDate {
  return new Date(day * MS_PER_DAY).toISOString().slice(0, 10)
}

export function yearOf(date: CalendarDate): number {
  return Number(date.slice(0, 4))
}

export function addDays(date: CalendarDate, days: number): CalendarDate {
  return fromDayNumber(toDayNumber(date) + days)
}

/** Сдвиг на месяцы; если в целевом месяце нет такого числа — последний день месяца (29.02 → 28.02). */
export function addMonths(date: CalendarDate, months: number): CalendarDate {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  const target = new Date(Date.UTC(y, m - 1 + months, 1))
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  target.setUTCDate(Math.min(d, lastDay))
  return target.toISOString().slice(0, 10)
}

export function isCalendarDate(value: unknown): value is CalendarDate {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && fromDayNumber(toDayNumber(value)) === value
}
