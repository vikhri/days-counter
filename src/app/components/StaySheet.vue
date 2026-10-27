<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, useId } from 'vue'
import type { CalendarDate, CountryCode, Stay } from '../../domain/types'
import { validateStay } from '../../domain/validation'
import type { StayInput } from '../api'
import { COUNTRY_OPTIONS, type CountryOption } from '../countries'
import { countryName, formatDays, formatShortDate, stayErrorText, stayLength, stayWarningText } from '../format'
import CountryFlag from './CountryFlag.vue'

const props = defineProps<{
  /** Редактируемое пребывание; без него шторка добавляет новое. */
  stay?: Stay
  /** Даты, которыми заполнить новое пребывание. */
  draft?: { entry: CalendarDate; exit: CalendarDate }
  stays: Stay[]
  today: CalendarDate
  busy: boolean
  /** Ошибка сервера после отправки — показывается в строке-сводке. */
  error?: string
}>()

const emit = defineEmits<{ submit: [input: StayInput]; close: [] }>()

const titleId = useId()
const title = props.stay ? 'Поездка' : 'Новая поездка'
const submitLabel = props.stay ? 'Сохранить' : 'Добавить поездку'

const country = ref<CountryCode | null>(props.stay?.country ?? null)
const entry = ref(props.stay?.entry ?? props.draft?.entry ?? '')
const exit = ref(props.stay?.exit ?? props.draft?.exit ?? '')
const isOpen = ref(props.stay?.exit === null)
/** Какой конец сейчас редактируется — его таблетка акцентная. */
const activeDate = ref<'entry' | 'exit'>('entry')

const input = computed<StayInput | null>(() => {
  if (!country.value || !entry.value) return null
  if (!isOpen.value && !exit.value) return null
  return { country: country.value, entry: entry.value, exit: isOpen.value ? null : exit.value }
})

const validation = computed(() =>
  input.value ? validateStay({ id: props.stay?.id ?? '', ...input.value }, props.stays, props.today) : null,
)

const canSubmit = computed(() => input.value !== null && validation.value?.errors.length === 0 && !props.busy)

/** «11 дней · Германия»; пусто, пока не хватает данных или даты перепутаны. */
const summary = computed(() => {
  const value = input.value
  if (!value || (value.exit ?? props.today) < value.entry) return ''
  return `${formatDays(stayLength({ id: '', ...value }, props.today))} · ${countryName(value.country)}`
})

const note = computed(() => {
  if (props.error) return { text: props.error, tone: 'error' }
  const error = validation.value?.errors[0]
  if (error) return { text: stayErrorText(error), tone: 'error' }
  const warning = validation.value?.warnings[0]
  if (warning) return { text: stayWarningText(warning), tone: 'plan' }
  return null
})

function submit() {
  if (canSubmit.value && input.value) emit('submit', input.value)
}

/** В десктопном браузере клик по скрытому полю даты сам календарь не открывает. */
function openPicker(event: Event) {
  try {
    ;(event.target as HTMLInputElement).showPicker?.()
  } catch {
    // showPicker недоступен — остаётся нативное поведение поля
  }
}

// Выбор страны — второй экран той же шторки.
const view = ref<'form' | 'country'>('form')
const query = ref('')
const searchInput = ref<HTMLInputElement | null>(null)

/** Страны из пребываний, последние поездки первыми. */
const recentCountries = computed<CountryOption[]>(() => {
  const codes = [...props.stays].sort((a, b) => b.entry.localeCompare(a.entry)).map((s) => s.country)
  return [...new Set(codes)].map((code) => ({ code, name: countryName(code) }))
})

const foundCountries = computed(() => {
  const wanted = query.value.trim().toLocaleLowerCase('ru')
  return wanted ? COUNTRY_OPTIONS.filter((c) => c.name.toLocaleLowerCase('ru').includes(wanted)) : COUNTRY_OPTIONS
})

async function openCountryPicker() {
  query.value = ''
  view.value = 'country'
  await nextTick()
  searchInput.value?.focus()
}

function pickCountry(code: CountryCode) {
  country.value = code
  view.value = 'form'
}

// Открытие, закрытие и смахивание вниз.
const dialog = ref<HTMLDialogElement | null>(null)
const closing = ref(false)
const dragY = ref(0)
let dragStart: number | null = null

/** Смахивание дальше этого закрывает шторку, ближе — возвращает на место. */
const CLOSE_DISTANCE = 120
const CLOSE_DURATION = 200

onMounted(() => {
  dialog.value?.showModal()
  document.documentElement.classList.add('sheet-open')
})

onUnmounted(() => document.documentElement.classList.remove('sheet-open'))

function close() {
  if (closing.value) return
  closing.value = true
  dragY.value = 0
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  setTimeout(() => emit('close'), reduced ? 0 : CLOSE_DURATION)
}

defineExpose({ close })

function onBackdropClick(event: MouseEvent) {
  const sheet = dialog.value?.getBoundingClientRect()
  if (event.target === dialog.value && sheet && event.clientY < sheet.top) close()
}

function onDragStart(event: PointerEvent) {
  if ((event.target as HTMLElement).closest('button')) return
  dragStart = event.clientY
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function onDragMove(event: PointerEvent) {
  if (dragStart !== null) dragY.value = Math.max(0, event.clientY - dragStart)
}

function onDragEnd() {
  if (dragStart === null) return
  dragStart = null
  if (dragY.value > CLOSE_DISTANCE) close()
  else dragY.value = 0
}
</script>

<template>
  <dialog
    ref="dialog"
    class="sheet"
    :class="{ closing, dragging: dragY > 0 }"
    :style="dragY ? { transform: `translateY(${dragY}px)` } : undefined"
    :aria-labelledby="titleId"
    @cancel.prevent="close"
    @click="onBackdropClick"
  >
    <div
      class="handle"
      @pointerdown="onDragStart"
      @pointermove="onDragMove"
      @pointerup="onDragEnd"
      @pointercancel="onDragEnd"
    >
      <span
        class="grabber"
        aria-hidden="true"
      />
      <header class="sheet-head">
        <button
          v-if="view === 'country'"
          type="button"
          class="text-btn"
          @click="view = 'form'"
        >
          Назад
        </button>
        <button
          v-else
          type="button"
          class="text-btn"
          @click="close"
        >
          Отмена
        </button>
        <h2 :id="titleId">
          {{ view === 'country' ? 'Страна' : title }}
        </h2>
        <span aria-hidden="true" />
      </header>
    </div>

    <form
      v-if="view === 'form'"
      class="body"
      novalidate
      @submit.prevent="submit"
    >
      <div class="group">
        <button
          type="button"
          class="row"
          @click="openCountryPicker"
        >
          <span class="label">Страна</span>
          <span class="value">
            <template v-if="country">
              <CountryFlag
                :code="country"
                :size="24"
              />
              <span class="value-text">{{ countryName(country) }}</span>
            </template>
            <span
              v-else
              class="placeholder"
            >Выбрать</span>
            <span
              class="chevron"
              aria-hidden="true"
            />
          </span>
        </button>

        <div class="row">
          <span class="label">Въезд</span>
          <label
            class="pill"
            :class="{ active: activeDate === 'entry', empty: !entry }"
          >
            {{ entry ? formatShortDate(entry, true) : 'Выбрать' }}
            <input
              v-model="entry"
              type="date"
              aria-label="Въезд"
              @focus="activeDate = 'entry'"
              @click="openPicker"
            >
          </label>
        </div>

        <div class="row">
          <span class="label">Выезд</span>
          <span
            v-if="isOpen"
            class="pill static"
          >по сегодня</span>
          <label
            v-else
            class="pill"
            :class="{ active: activeDate === 'exit', empty: !exit }"
          >
            {{ exit ? formatShortDate(exit, true) : 'Выбрать' }}
            <input
              v-model="exit"
              type="date"
              aria-label="Выезд"
              @focus="activeDate = 'exit'"
              @click="openPicker"
            >
          </label>
        </div>

        <label class="row">
          <span class="label">Я ещё там</span>
          <input
            v-model="isOpen"
            type="checkbox"
            role="switch"
            class="switch"
          >
        </label>
      </div>

      <!-- Место под сводку зарезервировано, чтобы ничего не прыгало. -->
      <div
        class="summary"
        aria-live="polite"
      >
        <p class="summary-main">
          <svg
            v-if="summary"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <rect
              x="3"
              y="5"
              width="18"
              height="16"
              rx="2"
            />
            <path d="M3 10h18M8 3v4M16 3v4" />
          </svg>
          {{ summary }}
        </p>
        <p
          class="summary-note"
          :class="note?.tone"
        >
          {{ note?.text }}
        </p>
      </div>

      <div class="actions">
        <button
          type="submit"
          class="primary"
          :disabled="!canSubmit"
        >
          {{ submitLabel }}
        </button>
      </div>
    </form>

    <div
      v-else
      class="body picker"
    >
      <input
        ref="searchInput"
        v-model="query"
        type="search"
        class="search"
        placeholder="Поиск страны"
        aria-label="Поиск страны"
      >
      <div class="list">
        <template v-if="!query && recentCountries.length">
          <p class="list-label">
            Ваши страны
          </p>
          <div class="group">
            <button
              v-for="c in recentCountries"
              :key="c.code"
              type="button"
              class="row option"
              :aria-pressed="country === c.code"
              @click="pickCountry(c.code)"
            >
              <CountryFlag
                :code="c.code"
                :size="28"
              />
              <span class="value-text">{{ c.name }}</span>
            </button>
          </div>
        </template>
        <p class="list-label">
          {{ query ? 'Найдено' : 'Все страны' }}
        </p>
        <div
          v-if="foundCountries.length"
          class="group"
        >
          <button
            v-for="c in foundCountries"
            :key="c.code"
            type="button"
            class="row option"
            :aria-pressed="country === c.code"
            @click="pickCountry(c.code)"
          >
            <CountryFlag
              :code="c.code"
              :size="28"
            />
            <span class="value-text">{{ c.name }}</span>
          </button>
        </div>
        <p
          v-else
          class="nothing"
        >
          Такой страны нет
        </p>
      </div>
    </div>
  </dialog>
</template>

<style scoped>
.sheet {
  position: fixed;
  inset: auto 0 0;
  width: 100%;
  max-width: 760px;
  height: min(92dvh, 720px);
  max-height: none;
  margin: 0 auto;
  padding: 0;
  border: none;
  border-radius: 14px 14px 0 0;
  background: var(--sheet);
  color: var(--text);
  transition: transform 0.2s ease;
  animation: sheet-in 0.25s ease;
}

.sheet[open] {
  display: flex;
  flex-direction: column;
}

.sheet.dragging {
  transition: none;
}

.sheet.closing {
  transform: translateY(100%);
}

.sheet::backdrop {
  background: var(--scrim);
}

@keyframes sheet-in {
  from {
    transform: translateY(100%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .sheet {
    transition: none;
    animation: none;
  }
}

.handle {
  flex: none;
  touch-action: none;
}

.grabber {
  display: block;
  width: 36px;
  height: 5px;
  margin: 6px auto 0;
  border-radius: 3px;
  background: var(--faint);
}

.sheet-head {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  height: 44px;
  padding: 0 8px;
}

.sheet-head h2 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
}

.text-btn {
  justify-self: start;
  min-height: 0;
  padding: 8px;
  border: none;
  background: transparent;
  color: var(--accent);
  font-size: 17px;
}

.body {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  padding: 8px 16px 0;
}

.group {
  overflow: hidden;
  border-radius: 12px;
  background: var(--cell);
}

.row {
  display: flex;
  width: 100%;
  height: 50px;
  min-height: 0;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  border: none;
  border-radius: 0;
  background: transparent;
  color: var(--text);
  font-size: 16px;
  text-align: left;
}

.row + .row {
  box-shadow: inset 0 0.5px 0 var(--separator);
}

.label {
  flex: none;
}

.value {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
  color: var(--muted);
}

.value-text {
  overflow: hidden;
  color: var(--text);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.placeholder {
  color: var(--faint);
}

.chevron {
  flex: none;
  width: 7px;
  height: 7px;
  margin-left: 2px;
  border-right: 2px solid var(--faint);
  border-bottom: 2px solid var(--faint);
  transform: rotate(-45deg);
}

.pill {
  position: relative;
  flex: none;
  padding: 6px 12px;
  border-radius: 8px;
  background: var(--fill);
  color: var(--text);
  font-size: 16px;
  white-space: nowrap;
}

.pill.empty {
  color: var(--faint);
}

.pill.active {
  background: var(--accent-soft);
  color: var(--accent);
}

.pill.static {
  color: var(--muted);
}

/* Нативное поле даты лежит прозрачным поверх таблетки: тап открывает системный выбор даты. */
.pill input {
  position: absolute;
  inset: 0;
  width: 100%;
  min-height: 0;
  padding: 0;
  border: none;
  opacity: 0;
  font-size: 16px;
  cursor: pointer;
}

.switch {
  position: relative;
  flex: none;
  width: 51px;
  height: 31px;
  min-height: 0;
  margin: 0;
  border-radius: 16px;
  background: var(--fill);
  appearance: none;
  cursor: pointer;
  transition: background 0.2s;
}

.switch::after {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 27px;
  height: 27px;
  border-radius: 50%;
  background: var(--surface);
  box-shadow: var(--segment-shadow);
  content: '';
  transition: transform 0.2s;
}

.switch:checked {
  background: var(--accent);
}

.switch:checked::after {
  transform: translateX(20px);
}

.switch:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.summary {
  display: grid;
  gap: 2px;
  min-height: 64px;
  padding: 12px 4px 0;
}

.summary p {
  margin: 0;
}

.summary-main {
  display: flex;
  gap: 8px;
  align-items: center;
  min-height: 22px;
  font-size: 16px;
  font-weight: 500;
}

.summary-main svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: var(--accent);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.summary-note {
  color: var(--muted);
  font-size: 13px;
}

.summary-note.plan {
  color: var(--warning-text);
}

.summary-note.error {
  color: var(--danger);
}

.actions {
  margin-top: auto;
  padding: 12px 0 calc(12px + env(safe-area-inset-bottom));
}

.primary {
  width: 100%;
  min-height: 50px;
  border-radius: 14px;
  font-size: 17px;
  font-weight: 600;
}

.picker {
  gap: 10px;
}

.search {
  flex: none;
  width: 100%;
  border: none;
  background: var(--fill);
  font-size: 16px;
}

.list {
  flex: 1;
  min-height: 0;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
  overflow-y: auto;
  overscroll-behavior: contain;
}

.list-label {
  margin: 12px 16px 6px;
  color: var(--muted);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.option {
  justify-content: flex-start;
}

.option[aria-pressed='true'] {
  color: var(--accent);
}

.option[aria-pressed='true'] .value-text {
  color: var(--accent);
  font-weight: 600;
}

.nothing {
  margin: 0 16px;
  color: var(--muted);
}
</style>
