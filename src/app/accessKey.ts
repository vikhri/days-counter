import { ref } from 'vue'

const STORAGE_KEY = 'days-counter:access-key'

function readStored(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

export const accessKey = ref(readStored())
/** Сервер отверг ключ — показать это на экране ввода. */
export const keyRejected = ref(false)

export function saveAccessKey(key: string) {
  accessKey.value = key
  keyRejected.value = false
  try {
    localStorage.setItem(STORAGE_KEY, key)
  } catch {
    // ключ проживёт до перезагрузки страницы
  }
}

export function rejectAccessKey() {
  accessKey.value = ''
  keyRejected.value = true
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // нечего удалять
  }
}
