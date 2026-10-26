import { ref } from 'vue'
import type { Stay } from '../domain/types'
import { api, type Settings, type StayInput } from './api'

const stays = ref<Stay[]>([])
const settings = ref<Settings>({ schengen: true })
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
  stays.value = [...stays.value, await api.createStay(input)]
}

async function updateStay(id: string, input: StayInput) {
  const updated = await api.updateStay(id, input)
  stays.value = stays.value.map((s) => (s.id === id ? updated : s))
}

async function deleteStay(id: string) {
  await api.deleteStay(id)
  stays.value = stays.value.filter((s) => s.id !== id)
}

async function setSchengen(schengen: boolean) {
  settings.value = await api.putSettings({ schengen })
}

export function useData() {
  return { stays, settings, loaded, loadError, reload, createStay, updateStay, deleteStay, setSchengen }
}
