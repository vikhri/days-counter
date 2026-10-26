import { describe, expect, it } from 'vitest'
import { countDays } from './counting'
import type { Stay } from './types'

const TODAY = '2026-10-26'

function stay(country: string, entry: string, exit: string | null): Stay {
  return { id: `${country}-${entry}`, country, entry, exit }
}

describe('countDays', () => {
  it('counts entry and exit days of a stay inside the current year', () => {
    const result = countDays([stay('FR', '2026-05-03', '2026-05-10')], { kind: 'currentYear' }, TODAY)

    expect(result.range).toEqual({ start: '2026-01-01', end: '2026-10-26' })
    expect(result.countries).toEqual([{ country: 'FR', days: 8, futureDays: 0 }])
    expect(result.unspecifiedDays).toBe(291)
  })

  it('counts a transit day in both countries, extends an open stay to today and sorts by days', () => {
    const stays = [
      stay('FR', '2026-03-01', '2026-03-05'),
      stay('RU', '2026-01-10', '2026-03-01'),
      stay('RU', '2026-03-05', null),
    ]

    const result = countDays(stays, { kind: 'currentYear' }, TODAY)

    expect(result.countries).toEqual([
      { country: 'RU', days: 287, futureDays: 0 },
      { country: 'FR', days: 5, futureDays: 0 },
    ])
    expect(result.unspecifiedDays).toBe(9)
  })

  it('counts only the part of a stay inside the period', () => {
    const result = countDays([stay('RU', '2025-12-20', '2026-01-10')], { kind: 'currentYear' }, TODAY)

    expect(result.countries).toEqual([{ country: 'RU', days: 10, futureDays: 0 }])
  })

  describe('periods', () => {
    it('last 12 months start the day after the same date a year ago', () => {
      const result = countDays([stay('RU', '2025-10-20', '2025-10-30')], { kind: 'last12Months' }, TODAY)

      expect(result.range).toEqual({ start: '2025-10-27', end: '2026-10-26' })
      expect(result.countries).toEqual([{ country: 'RU', days: 4, futureDays: 0 }])
    })

    it('last 12 months on a leap day start on March 1 of the previous year', () => {
      const result = countDays([], { kind: 'last12Months' }, '2028-02-29')

      expect(result.range).toEqual({ start: '2027-03-01', end: '2028-02-29' })
      expect(result.unspecifiedDays).toBe(366)
    })

    it('previous year is the whole previous calendar year', () => {
      const result = countDays([stay('RU', '2025-12-25', '2026-01-05')], { kind: 'previousYear' }, TODAY)

      expect(result.range).toEqual({ start: '2025-01-01', end: '2025-12-31' })
      expect(result.countries).toEqual([{ country: 'RU', days: 7, futureDays: 0 }])
      expect(result.unspecifiedDays).toBe(358)
    })

    it('all time starts at the earliest entry', () => {
      const stays = [stay('FR', '2026-10-20', null), stay('RU', '2024-03-01', '2024-03-10')]

      const result = countDays(stays, { kind: 'allTime' }, TODAY)

      expect(result.range).toEqual({ start: '2024-03-01', end: '2026-10-26' })
      expect(result.countries).toEqual([
        { country: 'RU', days: 10, futureDays: 0 },
        { country: 'FR', days: 7, futureDays: 0 },
      ])
    })

    it('a custom period ending after today counts future days separately', () => {
      const stays = [stay('RU', '2026-09-01', '2026-11-30'), stay('FR', '2026-11-30', '2026-12-10')]

      const result = countDays(stays, { kind: 'custom', start: '2026-10-01', end: '2026-12-31' }, TODAY)

      expect(result.range).toEqual({ start: '2026-10-01', end: '2026-12-31' })
      expect(result.countries).toEqual([
        { country: 'RU', days: 61, futureDays: 35 },
        { country: 'FR', days: 11, futureDays: 11 },
      ])
      expect(result.unspecifiedDays).toBe(21)
    })

    it('an open stay stops at today even in a custom period ending later', () => {
      const result = countDays([stay('RU', '2026-10-20', null)], { kind: 'custom', start: '2026-10-01', end: '2026-12-31' }, TODAY)

      expect(result.countries).toEqual([{ country: 'RU', days: 7, futureDays: 0 }])
    })
  })
})
