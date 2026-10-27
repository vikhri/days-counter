import { toDayNumber, yearOf } from './dates'
import type { CalendarDate, Stay } from './types'

export type StayGroup =
  /** Пребывания, которые включают сегодня: открытое или с выездом сегодня и позже. */
  | { kind: 'now'; stays: Stay[] }
  /** Начинаются после сегодня, ближайшие первыми. */
  | { kind: 'planned'; stays: Stay[] }
  /** Закончились до сегодня; год — по въезду, `days` — сумма дней пребываний группы. */
  | { kind: 'year'; year: number; days: number; stays: Stay[] }

const byEntry = (a: Stay, b: Stay) => a.entry.localeCompare(b.entry)

/** Группы для экрана пребываний: «Сейчас», «Запланировано», затем годы от новых к старым. Пустых групп нет. */
export function groupStays(stays: Stay[], today: CalendarDate): StayGroup[] {
  const now = stays.filter((s) => s.entry <= today && (s.exit === null || s.exit >= today)).sort(byEntry)
  const planned = stays.filter((s) => s.entry > today).sort(byEntry)
  const past = stays.filter((s) => s.exit !== null && s.exit < today).sort((a, b) => byEntry(b, a))

  const years = new Map<number, Stay[]>()
  for (const s of past) years.set(yearOf(s.entry), [...(years.get(yearOf(s.entry)) ?? []), s])

  return [
    ...(now.length ? [{ kind: 'now' as const, stays: now }] : []),
    ...(planned.length ? [{ kind: 'planned' as const, stays: planned }] : []),
    ...[...years].map(([year, group]) => ({
      kind: 'year' as const,
      year,
      days: group.reduce((sum, s) => sum + toDayNumber(s.exit ?? today) - toDayNumber(s.entry) + 1, 0),
      stays: group,
    })),
  ]
}
