import { Hono } from 'hono'
import { bearerAuth } from 'hono/bearer-auth'
import { timingSafeEqual } from 'hono/utils/buffer'
import type { CalendarDate, Stay } from '../domain/types'
import { validateStay } from '../domain/validation'
import { clientToday, parseStayInput } from './input'

type AppEnv = { Bindings: Env; Variables: { today: CalendarDate } }

interface StayRow {
  id: string
  country: string
  entry_date: string
  exit_date: string | null
}

const toStay = (row: StayRow): Stay => ({ id: row.id, country: row.country, entry: row.entry_date, exit: row.exit_date })

async function allStays(db: D1Database): Promise<Stay[]> {
  const { results } = await db
    .prepare('SELECT id, country, entry_date, exit_date FROM stays ORDER BY entry_date DESC')
    .all<StayRow>()
  return results.map(toStay)
}

const app = new Hono<AppEnv>().basePath('/api')

app.use('*', bearerAuth({ verifyToken: (token, c) => timingSafeEqual(token, (c.env as Env).ACCESS_KEY) }))
app.use('*', async (c, next) => {
  c.set('today', clientToday(c.req.header('X-Today')))
  await next()
})

app.get('/stays', async (c) => c.json(await allStays(c.env.DB)))

app.post('/stays', async (c) => {
  const input = parseStayInput(await c.req.json().catch(() => null))
  if (!input) return c.json({ error: 'invalid' }, 400)

  const stay: Stay = { id: crypto.randomUUID(), ...input }
  const { errors } = validateStay(stay, await allStays(c.env.DB), c.get('today'))
  if (errors.length) return c.json({ errors }, 422)

  await c.env.DB.prepare('INSERT INTO stays (id, country, entry_date, exit_date, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(stay.id, stay.country, stay.entry, stay.exit, new Date().toISOString())
    .run()
  return c.json(stay, 201)
})

app.put('/stays/:id', async (c) => {
  const input = parseStayInput(await c.req.json().catch(() => null))
  if (!input) return c.json({ error: 'invalid' }, 400)

  const stays = await allStays(c.env.DB)
  const stay: Stay = { id: c.req.param('id'), ...input }
  if (!stays.some((s) => s.id === stay.id)) return c.json({ error: 'not found' }, 404)
  const { errors } = validateStay(stay, stays, c.get('today'))
  if (errors.length) return c.json({ errors }, 422)

  await c.env.DB.prepare('UPDATE stays SET country = ?, entry_date = ?, exit_date = ? WHERE id = ?')
    .bind(stay.country, stay.entry, stay.exit, stay.id)
    .run()
  return c.json(stay)
})

app.delete('/stays/:id', async (c) => {
  const { meta } = await c.env.DB.prepare('DELETE FROM stays WHERE id = ?').bind(c.req.param('id')).run()
  return meta.changes ? c.body(null, 204) : c.json({ error: 'not found' }, 404)
})

app.get('/settings', async (c) => {
  const row = await c.env.DB.prepare("SELECT value FROM settings WHERE key = 'schengen'").first<{ value: string }>()
  return c.json({ schengen: row?.value !== 'false' })
})

app.put('/settings', async (c) => {
  const body = await c.req.json().catch(() => null)
  if (typeof body?.schengen !== 'boolean') return c.json({ error: 'invalid' }, 400)

  await c.env.DB.prepare("INSERT INTO settings (key, value) VALUES ('schengen', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .bind(String(body.schengen))
    .run()
  return c.json({ schengen: body.schengen })
})

export default app
