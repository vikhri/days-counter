import { describe, expect, it } from 'vitest'
import { recentYears } from './periods'

describe('recentYears', () => {
  it('offers the current year first and the two before it', () => {
    expect(recentYears('2026-10-26')).toEqual([2026, 2025, 2024])
  })

  it('switches on January 1', () => {
    expect(recentYears('2027-01-01')).toEqual([2027, 2026, 2025])
  })
})
