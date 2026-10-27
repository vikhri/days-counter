import { describe, expect, it } from 'vitest'
import { yearTimeline } from './timeline'
import type { Stay } from './types'

const TODAY = '2026-10-26'

function stay(country: string, entry: string, exit: string | null): Stay {
  return { id: `${country}-${entry}`, country, entry, exit }
}

const totalDays = (segments: { days: number }[]) => segments.reduce((sum, s) => sum + s.days, 0)

describe('yearTimeline', () => {
  it('splits the year into stays and unspecified days, past and future apart', () => {
    const segments = yearTimeline([stay('FR', '2026-05-03', '2026-05-10')], 2026, TODAY)

    expect(segments).toEqual([
      { country: null, start: '2026-01-01', end: '2026-05-02', days: 122, future: false },
      { country: 'FR', start: '2026-05-03', end: '2026-05-10', days: 8, future: false },
      { country: null, start: '2026-05-11', end: '2026-10-26', days: 169, future: false },
      { country: null, start: '2026-10-27', end: '2026-12-31', days: 66, future: true },
    ])
    expect(totalDays(segments)).toBe(365)
  })

  it('splits a stay that is going on now at today', () => {
    const segments = yearTimeline([stay('ES', '2026-09-01', '2026-11-15')], 2026, TODAY)

    expect(segments.filter((s) => s.country === 'ES')).toEqual([
      { country: 'ES', start: '2026-09-01', end: '2026-10-26', days: 56, future: false },
      { country: 'ES', start: '2026-10-27', end: '2026-11-15', days: 20, future: true },
    ])
  })

  it('gives a transit day to the country of arrival only', () => {
    const segments = yearTimeline([stay('RU', '2026-01-01', '2026-03-01'), stay('FR', '2026-03-01', '2026-03-05')], 2026, TODAY)

    expect(segments.slice(0, 2)).toEqual([
      { country: 'RU', start: '2026-01-01', end: '2026-02-28', days: 59, future: false },
      { country: 'FR', start: '2026-03-01', end: '2026-03-05', days: 5, future: false },
    ])
    expect(totalDays(segments)).toBe(365)
  })

  it('ends an open stay today and clips stays to the year', () => {
    const segments = yearTimeline([stay('RU', '2025-12-01', '2026-01-10'), stay('ES', '2026-10-20', null)], 2026, TODAY)

    expect(segments[0]).toEqual({ country: 'RU', start: '2026-01-01', end: '2026-01-10', days: 10, future: false })
    expect(segments.at(-2)).toEqual({ country: 'ES', start: '2026-10-20', end: '2026-10-26', days: 7, future: false })
    expect(segments.at(-1)).toMatchObject({ country: null, start: '2026-10-27', future: true })
  })

  it('has 366 days in a leap year', () => {
    expect(totalDays(yearTimeline([], 2028, '2028-06-01'))).toBe(366)
  })

  it('is all past for a year that is over', () => {
    expect(yearTimeline([], 2025, TODAY)).toEqual([
      { country: null, start: '2025-01-01', end: '2025-12-31', days: 365, future: false },
    ])
  })
})
