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

/** Видимость карточек дашборда; список стран виден всегда. */
const CARD_DEFAULTS = { showSchengen: false, showRussia: true, showUnspecified: true }
type Settings = typeof CARD_DEFAULTS
const SETTING_KEYS = Object.keys(CARD_DEFAULTS) as (keyof Settings)[]

async function readSettings(db: D1Database): Promise<Settings> {
  const { results } = await db.prepare('SELECT key, value FROM settings').all<{ key: string; value: string }>()
  const settings = { ...CARD_DEFAULTS }
  for (const { key, value } of results) {
    if ((SETTING_KEYS as string[]).includes(key)) settings[key as keyof Settings] = value === 'true'
  }
  return settings
}

app.get('/settings', async (c) => c.json(await readSettings(c.env.DB)))

/** Принимает любую часть настроек, возвращает их целиком. */
app.put('/settings', async (c) => {
  const body: unknown = await c.req.json().catch(() => null)
  if (typeof body !== 'object' || body === null) return c.json({ error: 'invalid' }, 400)
  const updates = SETTING_KEYS.filter((key) => key in body)
  if (!updates.length || updates.some((key) => typeof (body as Record<string, unknown>)[key] !== 'boolean')) {
    return c.json({ error: 'invalid' }, 400)
  }

  const upsert = c.env.DB.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
  await c.env.DB.batch(updates.map((key) => upsert.bind(key, String((body as Settings)[key]))))
  return c.json(await readSettings(c.env.DB))
})

export default app
