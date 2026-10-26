import { describe, expect, it } from 'vitest'
import type { Stay } from './types'
import { validateStay } from './validation'

const TODAY = '2026-10-26'

function stay(country: string, entry: string, exit: string | null): Stay {
  return { id: `${country}-${entry}`, country, entry, exit }
}

describe('validateStay', () => {
  it('rejects a stay that overlaps another one by more than a transit day', () => {
    const france = stay('FR', '2026-05-03', '2026-05-10')

    const result = validateStay(stay('DE', '2026-05-08', '2026-05-12'), [france], TODAY)

    expect(result).toEqual({ errors: [{ code: 'overlap', with: france }], warnings: [] })
  })

  it('accepts a transit day shared with the previous stay and ignores the stay being edited', () => {
    const france = stay('FR', '2026-05-03', '2026-05-10')
    const edited = { ...france, exit: '2026-05-12' }

    expect(validateStay(stay('DE', '2026-05-10', '2026-05-12'), [france], TODAY)).toEqual({ errors: [], warnings: [] })
    expect(validateStay(edited, [france], TODAY)).toEqual({ errors: [], warnings: [] })
  })

  it('rejects an exit before the entry', () => {
    const result = validateStay(stay('FR', '2026-05-10', '2026-05-03'), [], TODAY)

    expect(result.errors).toEqual([{ code: 'exitBeforeEntry' }])
  })

  describe('open stay', () => {
    it('allows only one open stay', () => {
      const russia = stay('RU', '2026-09-01', null)

      const result = validateStay(stay('FR', '2026-10-01', null), [russia], TODAY)

      expect(result.errors).toEqual([{ code: 'secondOpenStay', with: russia }])
    })

    it('must be the last stay: nothing may start after its entry', () => {
      const russia = stay('RU', '2026-09-01', null)
      const plannedFrance = stay('FR', '2026-12-01', '2026-12-10')

      expect(validateStay(plannedFrance, [russia], TODAY).errors).toEqual([{ code: 'overlap', with: russia }])
      expect(validateStay(russia, [plannedFrance], TODAY).errors).toEqual([{ code: 'overlap', with: plannedFrance }])
    })

    it('may touch the previous stay on its entry day', () => {
      const france = stay('FR', '2026-08-20', '2026-09-01')

      expect(validateStay(stay('RU', '2026-09-01', null), [france], TODAY).errors).toEqual([])
    })

    it('cannot start in the future', () => {
      const result = validateStay(stay('RU', '2026-11-01', null), [], TODAY)

      expect(result.errors).toEqual([{ code: 'openStayInFuture' }])
    })
  })

  it('warns when a stay reaches into the future but does not reject it', () => {
    expect(validateStay(stay('FR', '2026-10-20', '2026-11-05'), [], TODAY)).toEqual({ errors: [], warnings: [{ code: 'futureDates' }] })
    expect(validateStay(stay('FR', '2026-10-20', '2026-10-26'), [], TODAY).warnings).toEqual([])
  })
})
