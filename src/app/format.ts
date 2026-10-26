import { toDayNumber } from '../domain/dates'
import type { CalendarDate, CountryCode, DateRange, Stay } from '../domain/types'
import type { StayError, StayWarning } from '../domain/validation'

const regionNames = new Intl.DisplayNames(['ru'], { type: 'region' })
const fullDate = new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
const shortDate = new Intl.DateTimeFormat('ru', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })
const plural = new Intl.PluralRules('ru')
const DAY_WORDS: Record<string, string> = { one: 'день', few: 'дня', many: 'дней', other: 'дня' }

const asDate = (date: CalendarDate) => new Date(`${date}T00:00:00Z`)

export function countryName(code: CountryCode): string {
  return regionNames.of(code) ?? code
}

export function formatDate(date: CalendarDate): string {
  return fullDate.format(asDate(date))
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

/** «03.05.2026 – 10.05.2026» или «с 01.09.2026 по сегодня». */
export function formatShortStayDates(stay: Stay): string {
  const entry = shortDate.format(asDate(stay.entry))
  if (stay.exit === null) return `с ${entry} по сегодня`
  return stay.exit === stay.entry ? entry : `${entry} – ${shortDate.format(asDate(stay.exit))}`
}

export function formatDays(n: number): string {
  return `${n} ${DAY_WORDS[plural.select(n)]}`
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
      return 'Въезд в будущем не может быть «сейчас здесь» — укажите дату выезда'
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
      return 'Даты в будущем — это план, в текущих итогах не учитывается'
  }
}
