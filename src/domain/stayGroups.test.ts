import { describe, expect, it } from 'vitest'
import { groupStays } from './stayGroups'
import type { Stay } from './types'

const TODAY = '2026-10-26'

function stay(country: string, entry: string, exit: string | null): Stay {
  return { id: `${country}-${entry}`, country, entry, exit }
}

const ids = (stays: Stay[]) => stays.map((s) => s.id)

describe('groupStays', () => {
  it('puts a stay that is going on now in "now" even when it ends in the future', () => {
    const groups = groupStays([stay('ES', '2026-09-01', '2026-11-15'), stay('RU', '2026-12-01', '2026-12-10')], TODAY)

    expect(groups).toEqual([
      { kind: 'now', stays: [stay('ES', '2026-09-01', '2026-11-15')] },
      { kind: 'planned', stays: [stay('RU', '2026-12-01', '2026-12-10')] },
    ])
  })

  it('puts an open stay in "now"', () => {
    const groups = groupStays([stay('ES', '2026-09-01', null)], TODAY)

    expect(groups).toEqual([{ kind: 'now', stays: [stay('ES', '2026-09-01', null)] }])
  })

  it('treats a stay ending today as going on now', () => {
    const groups = groupStays([stay('FR', '2026-10-20', '2026-10-26')], TODAY)

    expect(groups[0]?.kind).toBe('now')
  })

  it('orders planned stays from the nearest', () => {
    const groups = groupStays([stay('RU', '2027-01-10', '2027-01-20'), stay('FR', '2026-11-01', '2026-11-05')], TODAY)

    expect(groups).toHaveLength(1)
    expect(ids(groups[0]!.stays)).toEqual(['FR-2026-11-01', 'RU-2027-01-10'])
  })

  it('groups past stays by entry year, newest first, with the sum of their days', () => {
    const groups = groupStays(
      [
        stay('RU', '2025-06-01', '2025-06-30'),
        stay('FR', '2026-05-03', '2026-05-10'),
        stay('RU', '2025-12-20', '2026-01-10'),
        stay('RU', '2026-01-10', '2026-03-01'),
      ],
      TODAY,
    )

    expect(groups.map((g) => (g.kind === 'year' ? [g.year, g.days, ids(g.stays)] : g.kind))).toEqual([
      [2026, 8 + 51, ['FR-2026-05-03', 'RU-2026-01-10']],
      [2025, 30 + 22, ['RU-2025-12-20', 'RU-2025-06-01']],
    ])
  })

  it('has no groups without stays', () => {
    expect(groupStays([], TODAY)).toEqual([])
  })
})
