import { isCalendarDate, toDayNumber } from '../domain/dates'
import type { CalendarDate, Stay } from '../domain/types'

export type StayInput = Omit<Stay, 'id'>

export function parseStayInput(body: unknown): StayInput | null {
  if (typeof body !== 'object' || body === null) return null
  const { country, entry, exit } = body as Record<string, unknown>
  if (typeof country !== 'string' || !/^[A-Z]{2}$/.test(country)) return null
  if (!isCalendarDate(entry)) return null
  if (exit !== null && !isCalendarDate(exit)) return null
  return { country, entry, exit }
}

/**
 * «Сегодня» берём из заголовка клиента — это его локальная дата, иначе около полуночи
 * будущее и настоящее разойдутся с UTC. Дальше суток от UTC не верим.
 */
export function clientToday(header: string | undefined, now = new Date()): CalendarDate {
  const utc = now.toISOString().slice(0, 10)
  if (!isCalendarDate(header)) return utc
  return Math.abs(toDayNumber(header) - toDayNumber(utc)) <= 1 ? header : utc
}
