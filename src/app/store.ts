import { ref } from 'vue'
import type { Stay } from '../domain/types'
import { api, type Settings, type StayInput } from './api'

const stays = ref<Stay[]>([])
const settings = ref<Settings>({ showSchengen: false, showRussia: true, showUnspecified: true })
const loaded = ref(false)
const loadError = ref('')

async function reload() {
  loadError.value = ''
  try {
    const [loadedStays, loadedSettings] = await Promise.all([api.listStays(), api.getSettings()])
    stays.value = loadedStays
    settings.value = loadedSettings
    loaded.value = true
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : String(e)
  }
}

async function createStay(input: StayInput) {
  // Сервер ещё помнит отложенно удалённое пребывание и отверг бы пересечение с ним.
  await commitDeletion()
  stays.value = [...stays.value, await api.createStay(input)]
}

async function updateStay(id: string, input: StayInput) {
  await commitDeletion()
  const updated = await api.updateStay(id, input)
  stays.value = stays.value.map((s) => (s.id === id ? updated : s))
}

/** Сколько удаление можно отменить, пока виден тост. */
const UNDO_TIMEOUT = 5000

/** Удалено из списка, но на сервер ещё не отправлено. */
const pendingDeletion = ref<Stay | null>(null)
const deletionError = ref('')
let deletionTimer: ReturnType<typeof setTimeout> | undefined
let errorTimer: ReturnType<typeof setTimeout> | undefined

/** Строка пропадает сразу, запрос уходит, когда закроется тост. Следующее удаление отправляет предыдущее. */
function deleteWithUndo(stay: Stay) {
  void commitDeletion()
  stays.value = stays.value.filter((s) => s.id !== stay.id)
  pendingDeletion.value = stay
  deletionError.value = ''
  deletionTimer = setTimeout(() => void commitDeletion(), UNDO_TIMEOUT)
}

function undoDeletion() {
  const stay = pendingDeletion.value
  if (!stay) return
  clearTimeout(deletionTimer)
  pendingDeletion.value = null
  stays.value = [...stays.value, stay]
}

async function commitDeletion() {
  const stay = pendingDeletion.value
  if (!stay) return
  clearTimeout(deletionTimer)
  pendingDeletion.value = null
  try {
    await api.deleteStay(stay.id)
  } catch (e) {
    stays.value = [...stays.value, stay]
    deletionError.value = `Не удалось удалить: ${e instanceof Error ? e.message : String(e)}`
    clearTimeout(errorTimer)
    errorTimer = setTimeout(() => (deletionError.value = ''), UNDO_TIMEOUT)
  }
}

// Приложение свернули или закрывают — отправить удаление, не дожидаясь тоста.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') void commitDeletion()
})

async function updateSettings(changes: Partial<Settings>) {
  settings.value = await api.putSettings(changes)
}

export function useData() {
  return {
    stays,
    settings,
    loaded,
    loadError,
    reload,
    createStay,
    updateStay,
    deleteWithUndo,
    undoDeletion,
    pendingDeletion,
    deletionError,
    updateSettings,
  }
}
