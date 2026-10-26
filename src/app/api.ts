import type { Stay } from '../domain/types'
import type { StayError } from '../domain/validation'
import { accessKey, rejectAccessKey } from './accessKey'
import { localToday } from './today'

export type StayInput = Omit<Stay, 'id'>

/** Видимость карточек дашборда. */
export interface Settings {
  showSchengen: boolean
  showRussia: boolean
}

export class ValidationFailed extends Error {
  constructor(public readonly errors: StayError[]) {
    super('Пребывание не прошло проверку')
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Authorization: `Bearer ${accessKey.value}`, 'X-Today': localToday() }
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const res = await fetch(`/api${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  if (res.status === 401) {
    rejectAccessKey()
    throw new Error('Неверный ключ доступа')
  }
  if (res.status === 422) throw new ValidationFailed(((await res.json()) as { errors: StayError[] }).errors)
  if (!res.ok) throw new Error(`Сервер ответил ${res.status}`)
  return (res.status === 204 ? undefined : await res.json()) as T
}

export const api = {
  listStays: () => request<Stay[]>('GET', '/stays'),
  createStay: (input: StayInput) => request<Stay>('POST', '/stays', input),
  updateStay: (id: string, input: StayInput) => request<Stay>('PUT', `/stays/${id}`, input),
  deleteStay: (id: string) => request<void>('DELETE', `/stays/${id}`),
  getSettings: () => request<Settings>('GET', '/settings'),
  putSettings: (settings: Partial<Settings>) => request<Settings>('PUT', '/settings', settings),
}
