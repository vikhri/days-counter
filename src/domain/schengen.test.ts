import { describe, expect, it } from 'vitest'
import { schengenStatus } from './schengen'
import type { Stay } from './types'

const TODAY = '2026-10-26'

function stay(country: string, entry: string, exit: string | null): Stay {
  return { id: `${country}-${entry}`, country, entry, exit }
}

describe('schengenStatus', () => {
  it('counts a transit day between two Schengen countries once and ignores other countries', () => {
    const stays = [
      stay('FR', '2026-10-01', '2026-10-10'),
      stay('DE', '2026-10-10', '2026-10-15'),
      stay('RU', '2026-10-15', null),
    ]

    expect(schengenStatus(stays, TODAY)).toEqual({ used: 15, left: 75 })
  })

  it('counts only days inside the last 180 days and treats Monaco as Schengen', () => {
    const stays = [stay('IT', '2026-04-25', '2026-05-04'), stay('MC', '2026-06-01', '2026-06-02')]

    expect(schengenStatus(stays, TODAY)).toEqual({ used: 7, left: 83 })
  })

  it('never reports negative days left', () => {
    const stays = [stay('ES', '2026-06-01', '2026-09-30')]

    expect(schengenStatus(stays, TODAY)).toEqual({ used: 122, left: 0 })
  })
})
