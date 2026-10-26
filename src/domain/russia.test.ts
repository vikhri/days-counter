import { describe, expect, it } from 'vitest'
import { russiaStatus } from './russia'
import type { Stay } from './types'

const TODAY = '2026-10-26'

function stay(country: string, entry: string, exit: string | null): Stay {
  return { id: `${country}-${entry}`, country, entry, exit }
}

describe('russiaStatus', () => {
  it('reports the current year, the last 12 months and the previous year separately', () => {
    const stays = [
      stay('RU', '2025-07-01', '2026-02-15'),
      stay('FR', '2026-02-15', '2026-03-01'),
      stay('RU', '2026-03-01', '2026-05-31'),
    ]

    expect(russiaStatus(stays, TODAY)).toEqual({
      currentYear: { year: 2026, days: 138, resident: false },
      today: { days: 204, resident: true },
      previousYear: { year: 2025, days: 184, resident: true },
    })
  })

  it('exactly 183 days make a resident, 182 do not', () => {
    expect(russiaStatus([stay('RU', '2025-07-02', '2025-12-31')], TODAY).previousYear).toEqual({ year: 2025, days: 183, resident: true })
    expect(russiaStatus([stay('RU', '2025-07-03', '2025-12-31')], TODAY).previousYear).toEqual({ year: 2025, days: 182, resident: false })
  })

  it('does not count planned future days in the current year', () => {
    const status = russiaStatus([stay('RU', '2026-01-01', '2026-12-31')], TODAY)

    expect(status.currentYear).toEqual({ year: 2026, days: 299, resident: true })
  })
})
