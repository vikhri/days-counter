import { toDayNumber } from './dates'
import type { CalendarDate, Stay } from './types'

export type StayError =
  | { code: 'exitBeforeEntry' }
  | { code: 'openStayInFuture' }
  | { code: 'overlap'; with: Stay }
  | { code: 'secondOpenStay'; with: Stay }

/** Даты позже сегодня — это план: сохранить можно, в текущих итогах не учитывается. */
export type StayWarning = { code: 'futureDates' }

export interface StayValidation {
  errors: StayError[]
  warnings: StayWarning[]
}

/** Пересечение больше стыка; открытое пребывание бесконечно вправо. */
function overlaps(a: Stay, b: Stay): boolean {
  const end = (s: Stay) => (s.exit === null ? Infinity : toDayNumber(s.exit))
  return toDayNumber(a.entry) < end(b) && toDayNumber(b.entry) < end(a)
}

/** Проверяет пребывание против остальных; пребывание с тем же id (редактируемое) пропускается. */
export function validateStay(candidate: Stay, others: Stay[], today: CalendarDate): StayValidation {
  if (candidate.exit !== null && candidate.exit < candidate.entry) {
    return { errors: [{ code: 'exitBeforeEntry' }], warnings: [] }
  }

  const errors: StayError[] = []
  if (candidate.exit === null && candidate.entry > today) errors.push({ code: 'openStayInFuture' })
  for (const other of others) {
    if (other.id === candidate.id) continue
    if (candidate.exit === null && other.exit === null) errors.push({ code: 'secondOpenStay', with: other })
    else if (overlaps(candidate, other)) errors.push({ code: 'overlap', with: other })
  }

  const inFuture = candidate.entry > today || (candidate.exit !== null && candidate.exit > today)
  return { errors, warnings: inFuture ? [{ code: 'futureDates' }] : [] }
}
