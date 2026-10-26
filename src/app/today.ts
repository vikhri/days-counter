import type { CalendarDate } from '../domain/types'

/** Сегодняшняя дата по часам устройства, а не по UTC. */
export function localToday(now = new Date()): CalendarDate {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}
