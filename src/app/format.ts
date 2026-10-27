import { toDayNumber } from '../domain/dates'
import type { CalendarDate, CountryCode, DateRange, Stay } from '../domain/types'
import type { StayError, StayWarning } from '../domain/validation'

const regionNames = new Intl.DisplayNames(['ru'], { type: 'region' })
const fullDate = new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
const dayMonth = new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'long', timeZone: 'UTC' })
/** Короткие месяцы из дизайна: Intl даёт «февр.», «сент.», «нояб.» с точками. */
const SHORT_MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
const plural = new Intl.PluralRules('ru')
const DAY_WORDS: Record<string, string> = { one: 'день', few: 'дня', many: 'дней', other: 'дня' }
const VISIT_WORDS: Record<string, string> = { one: 'визит', few: 'визита', many: 'визитов', other: 'визита' }

const asDate = (date: CalendarDate) => new Date(`${date}T00:00:00Z`)

export function countryName(code: CountryCode): string {
  return regionNames.of(code) ?? code
}

export function formatDate(date: CalendarDate): string {
  return fullDate.format(asDate(date))
}

/** «30 ноября». */
export function formatDayMonth(date: CalendarDate): string {
  return dayMonth.format(asDate(date))
}

/** «31 авг» или «31 авг 2025». */
export function formatShortDate(date: CalendarDate, withYear = false): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  return `${d} ${SHORT_MONTHS[m - 1]}${withYear ? ` ${y}` : ''}`
}

/** «3–10 мая 2026 г.»; для одного дня — просто дата. */
export function formatDateRange(range: DateRange): string {
  return range.start === range.end ? formatDate(range.start) : fullDate.formatRange(asDate(range.start), asDate(range.end))
}

/** «3–10 мая 2026 г.» или «с 1 сентября 2026 г. по сегодня». */
export function formatStayDates(stay: Stay): string {
  if (stay.exit === null) return `с ${formatDate(stay.entry)} по сегодня`
  return formatDateRange({ start: stay.entry, end: stay.exit })
}

/** «день», «дня» или «дней» — по числу. */
export function dayWord(n: number): string {
  return DAY_WORDS[plural.select(n)]!
}

export function formatDays(n: number): string {
  return `${n} ${dayWord(n)}`
}

/** «1 визит», «3 визита», «5 визитов». */
export function formatVisits(n: number): string {
  return `${n} ${VISIT_WORDS[plural.select(n)]}`
}

/** Дней в пребывании, включая въезд и выезд; открытое — по сегодня. */
export function stayLength(stay: Stay, today: CalendarDate): number {
  return toDayNumber(stay.exit ?? today) - toDayNumber(stay.entry) + 1
}

export function stayErrorText(error: StayError): string {
  switch (error.code) {
    case 'exitBeforeEntry':
      return 'Дата выезда раньше даты въезда'
    case 'openStayInFuture':
      return 'Въезд в будущем не может быть «Я ещё там» — укажите дату выезда'
    case 'secondOpenStay':
      return `Уже есть открытое пребывание: ${countryName(error.with.country)}, ${formatStayDates(error.with)}. Сначала закройте его датой выезда`
    case 'overlap':
      return error.with.exit === null
        ? `Пересекается с открытым пребыванием: ${countryName(error.with.country)}, ${formatStayDates(error.with)}. Чтобы добавить что-то после него, сначала закройте его датой выезда`
        : `Пересекается с пребыванием: ${countryName(error.with.country)}, ${formatStayDates(error.with)}`
  }
}

export function stayWarningText(warning: StayWarning): string {
  switch (warning.code) {
    case 'futureDates':
      return 'Даты в будущем — сохранится как план'
  }
}
