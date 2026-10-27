import type { CountryCode } from '../domain/types'

/** Цвета из дизайна есть только у трёх стран. */
const NAMED: Record<CountryCode, string> = {
  RU: 'var(--country-ru)',
  FR: 'var(--country-fr)',
  ES: 'var(--country-es)',
}

/** Сколько токенов --country-other-N в style.css. */
const OTHER_COLORS = 5

/** Цвет страны на графиках; у остальных стран он берётся по коду, чтобы не менялся от периода к периоду. */
export function countryColor(code: CountryCode): string {
  const named = NAMED[code]
  if (named) return named
  const hash = [...code].reduce((h, c) => h * 31 + c.charCodeAt(0), 0)
  return `var(--country-other-${(hash % OTHER_COLORS) + 1})`
}
