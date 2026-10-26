import flagIconCountries from 'flag-icons/country.json'
import type { CountryCode } from '../domain/types'
import { countryName } from './format'

export interface CountryOption {
  code: CountryCode
  name: string
}

/** Все страны ISO 3166-1 с русскими названиями, по алфавиту. */
export const COUNTRY_OPTIONS: CountryOption[] = flagIconCountries
  .filter((c) => c.iso)
  .map((c) => {
    const code = c.code.toUpperCase()
    return { code, name: countryName(code) }
  })
  .sort((a, b) => a.name.localeCompare(b.name, 'ru'))

export function findCountryByName(name: string): CountryCode | null {
  const wanted = name.trim().toLocaleLowerCase('ru')
  return COUNTRY_OPTIONS.find((c) => c.name.toLocaleLowerCase('ru') === wanted)?.code ?? null
}
