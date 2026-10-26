import { addDays } from './dates'
import { countPresenceDays } from './presence'
import type { CalendarDate, CountryCode, Stay } from './types'

export const SCHENGEN_LIMIT = 90

/**
 * Состав на 01.01.2025 (Болгария и Румыния — последние вступившие), плюс микрогосударства
 * с открытой границей. Кипр и Ирландия не применяют шенгенские правила.
 * https://home-affairs.ec.europa.eu/policies/schengen/schengen-area_en
 */
export const SCHENGEN_COUNTRIES: ReadonlySet<CountryCode> = new Set([
  'AT', 'BE', 'BG', 'HR', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IT', 'LV', 'LT',
  'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  'IS', 'LI', 'NO', 'CH',
  'MC', 'SM', 'VA',
])

export interface SchengenStatus {
  used: number
  left: number
}

/** Окно 90/180: последние 180 дней, считая сегодняшний. */
export function schengenStatus(stays: Stay[], today: CalendarDate): SchengenStatus {
  const window = { start: addDays(today, -179), end: today }
  const used = countPresenceDays(stays.filter((s) => SCHENGEN_COUNTRIES.has(s.country)), window, today)
  return { used, left: Math.max(0, SCHENGEN_LIMIT - used) }
}
