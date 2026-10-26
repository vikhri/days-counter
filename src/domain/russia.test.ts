import { describe, expect, it } from 'vitest'
import { russiaStatus } from './russia'
import type { Stay } from './types'

const TODAY = '2026-10-26'

function stay(country: string, entry: string, exit: string | null): Stay {
  return { id: `${country}-${entry}`, country, entry, exit }
}

describe('russiaStatus', () => {
  it('reports days in Russia since January 1 and how many more are allowed', () => {
    const stays = [stay('RU', '2025-12-01', '2026-06-30'), stay('FR', '2026-06-30', '2026-07-10')]

    expect(russiaStatus(stays, TODAY)).toEqual({
      year: 2026,
      days: 181,
      allowance: 1,
      resident: false,
      unreachable: false,
      planned: null,
    })
  })

  it('has no allowance left at 182 days and makes a resident at 183', () => {
    const at182 = russiaStatus([stay('RU', '2026-01-01', '2026-07-01')], TODAY)
    const at183 = russiaStatus([stay('RU', '2026-01-01', '2026-07-02')], TODAY)

    expect(at182).toMatchObject({ days: 182, allowance: 0, resident: false })
    expect(at183).toMatchObject({ days: 183, allowance: 0, resident: true })
  })

  it('is unreachable when even the rest of the year in Russia would not make 183 days', () => {
    // до 31 декабря после сегодня осталось 66 дней
    const at116 = russiaStatus([stay('RU', '2026-01-01', '2026-04-26')], TODAY)
    const at117 = russiaStatus([stay('RU', '2026-01-01', '2026-04-27')], TODAY)

    expect(at116).toMatchObject({ days: 116, unreachable: true })
    expect(at117).toMatchObject({ days: 117, unreachable: false })
  })

  describe('planned trips to Russia this year', () => {
    const before = stay('RU', '2026-01-01', '2026-06-20') // 171 день, запас 11

    it('reduce the allowance by the planned days', () => {
      const status = russiaStatus([before, stay('RU', '2026-12-01', '2026-12-10')], TODAY)

      expect(status).toMatchObject({ days: 171, allowance: 11, planned: { allowance: 1, resident: false } })
    })

    it('show that the plan crosses the threshold', () => {
      const status = russiaStatus([before, stay('RU', '2026-12-01', '2026-12-20')], TODAY)

      expect(status.planned).toEqual({ allowance: 0, resident: true })
    })

    it('count only up to December 31', () => {
      const status = russiaStatus([before, stay('RU', '2026-12-25', '2027-01-10')], TODAY)

      expect(status.planned).toEqual({ allowance: 4, resident: false })
    })
  })
})
