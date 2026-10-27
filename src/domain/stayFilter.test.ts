import { describe, expect, it } from 'vitest'
import { filterStays, resolveDateFilter, type StayFilter } from './stayFilter'
import type { Stay } from './types'

const TODAY = '2026-10-26'

function stay(country: string, entry: string, exit: string | null): Stay {
  return { id: `${country}-${entry}`, country, entry, exit }
}

const ids = (stays: Stay[]) => stays.map((s) => s.id)
const custom = (start: string, end: string): StayFilter['dates'] => ({ kind: 'custom', start, end })

const STAYS = [
  stay('ES', '2025-12-20', '2026-01-05'),
  stay('FR', '2026-03-01', '2026-03-10'),
  stay('ES', '2026-06-01', '2026-06-15'),
  stay('RU', '2026-09-01', null),
  stay('FR', '2026-12-01', '2026-12-10'),
]

describe('filterStays', () => {
  it('keeps everything without a filter', () => {
    expect(filterStays(STAYS, { country: null, dates: { kind: 'any' } }, TODAY)).toEqual(STAYS)
  })

  it('filters by country', () => {
    const found = filterStays(STAYS, { country: 'ES', dates: { kind: 'any' } }, TODAY)

    expect(ids(found)).toEqual(['ES-2025-12-20', 'ES-2026-06-01'])
  })

  it('keeps stays that only touch the period at its edges', () => {
    const found = filterStays(STAYS, { country: null, dates: custom('2026-01-05', '2026-03-01') }, TODAY)

    expect(ids(found)).toEqual(['ES-2025-12-20', 'FR-2026-03-01'])
  })

  it('drops stays that end the day before the period starts', () => {
    const found = filterStays(STAYS, { country: null, dates: custom('2026-03-11', '2026-05-31') }, TODAY)

    expect(found).toEqual([])
  })

  it('stretches an open stay up to today, not further', () => {
    expect(ids(filterStays(STAYS, { country: null, dates: custom('2026-10-26', '2026-10-30') }, TODAY))).toEqual([
      'RU-2026-09-01',
    ])
    expect(filterStays(STAYS, { country: null, dates: custom('2026-10-27', '2026-11-30') }, TODAY)).toEqual([])
  })

  it('combines country and dates', () => {
    const found = filterStays(STAYS, { country: 'FR', dates: { kind: 'currentYear' } }, TODAY)

    expect(ids(found)).toEqual(['FR-2026-03-01', 'FR-2026-12-01'])
  })

  it('takes a stay across the new year into both years', () => {
    expect(ids(filterStays(STAYS, { country: 'ES', dates: { kind: 'previousYear' } }, TODAY))).toEqual(['ES-2025-12-20'])
    expect(ids(filterStays(STAYS, { country: 'ES', dates: { kind: 'currentYear' } }, TODAY))).toContain('ES-2025-12-20')
  })
})

describe('resolveDateFilter', () => {
  it('takes the whole current year, planned stays included', () => {
    expect(resolveDateFilter({ kind: 'currentYear' }, TODAY)).toEqual({ start: '2026-01-01', end: '2026-12-31' })
  })

  it('ends the last 12 months today', () => {
    expect(resolveDateFilter({ kind: 'last12Months' }, TODAY)).toEqual({ start: '2025-10-27', end: '2026-10-26' })
  })

  it('has no range for any dates', () => {
    expect(resolveDateFilter({ kind: 'any' }, TODAY)).toBeNull()
  })
})
