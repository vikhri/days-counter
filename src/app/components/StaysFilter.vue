<script setup lang="ts">
import { computed, ref } from 'vue'
import { yearOf } from '../../domain/dates'
import type { DateFilter } from '../../domain/stayFilter'
import type { CalendarDate, CountryCode } from '../../domain/types'
import { countryName, formatShortRange } from '../format'
import BottomSheet from './BottomSheet.vue'
import CountryFlag from './CountryFlag.vue'
import RangeCalendar from './RangeCalendar.vue'

const props = defineProps<{
  /** Страны, где есть пребывания. */
  countries: CountryCode[]
  today: CalendarDate
}>()

const country = defineModel<CountryCode | null>('country', { required: true })
const dates = defineModel<DateFilter>('dates', { required: true })

/** По алфавиту; выбранная страна остаётся в списке, даже если её пребывания удалили. */
const countryOptions = computed(() =>
  [...new Set([...props.countries, ...(country.value ? [country.value] : [])])].sort((a, b) =>
    countryName(a).localeCompare(countryName(b), 'ru'),
  ),
)

type Preset = Exclude<DateFilter['kind'], 'custom'>

const presets = computed<{ kind: Preset; label: string; short: string }[]>(() => {
  const year = String(yearOf(props.today))
  const previous = String(yearOf(props.today) - 1)
  return [
    { kind: 'any', label: 'Любые даты', short: 'Любые даты' },
    { kind: 'currentYear', label: year, short: year },
    { kind: 'last12Months', label: 'Последние 12 месяцев', short: '12 месяцев' },
    { kind: 'previousYear', label: previous, short: previous },
  ]
})

/** «3 – 10 мая»; год — когда период не в текущем году. */
function rangeLabel(start: CalendarDate, end: CalendarDate) {
  return formatShortRange(start, end, yearOf(start) !== yearOf(props.today))
}

const datesLabel = computed(() => {
  const value = dates.value
  if (value.kind === 'custom') return rangeLabel(value.start, value.end)
  return presets.value.find((p) => p.kind === value.kind)?.short ?? ''
})

// Шторка выбора дат: пресет применяется сразу, свой период — календарём и кнопкой «Показать».
const datesOpen = ref(false)
const sheet = ref<InstanceType<typeof BottomSheet> | null>(null)
const picking = ref(false)
const start = ref<CalendarDate | ''>('')
const end = ref<CalendarDate | ''>('')

function openDates() {
  const value = dates.value
  picking.value = value.kind === 'custom'
  start.value = value.kind === 'custom' ? value.start : ''
  end.value = value.kind === 'custom' ? value.end : ''
  datesOpen.value = true
}

function pickPreset(kind: Preset) {
  dates.value = { kind }
  sheet.value?.close()
}

/** Первый тап — начало, второй — конец; тап раньше начала или после готового периода начинает заново. */
function pickDate(date: CalendarDate) {
  if (!start.value || end.value || date < start.value) {
    start.value = date
    end.value = ''
  } else {
    end.value = date
  }
}

function applyCustom() {
  if (!start.value || !end.value) return
  dates.value = { kind: 'custom', start: start.value, end: end.value }
  sheet.value?.close()
}
</script>

<template>
  <div class="stays-filter">
    <label
      class="filter-btn"
      :class="{ active: country }"
    >
      <CountryFlag
        v-if="country"
        :code="country"
        :size="20"
      />
      <svg
        v-else
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="9"
        />
        <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
      </svg>
      <span class="text">{{ country ? countryName(country) : 'Все страны' }}</span>
      <span
        class="chevron"
        aria-hidden="true"
      />
      <!-- Нативный выбор поверх кнопки: на телефоне открывается системный список. -->
      <select
        v-model="country"
        aria-label="Страна"
      >
        <option :value="null">
          Все страны
        </option>
        <option
          v-for="code in countryOptions"
          :key="code"
          :value="code"
        >
          {{ countryName(code) }}
        </option>
      </select>
    </label>

    <button
      type="button"
      class="filter-btn"
      :class="{ active: dates.kind !== 'any' }"
      aria-haspopup="dialog"
      :aria-label="`Даты: ${datesLabel}`"
      @click="openDates"
    >
      <svg
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
      <span class="text">{{ datesLabel }}</span>
      <span
        class="chevron"
        aria-hidden="true"
      />
    </button>

    <BottomSheet
      v-if="datesOpen"
      ref="sheet"
      title="Даты"
      @close="datesOpen = false"
    >
      <div class="body">
        <div class="group">
          <button
            v-for="preset in presets"
            :key="preset.kind"
            type="button"
            class="row"
            :aria-pressed="!picking && dates.kind === preset.kind"
            @click="pickPreset(preset.kind)"
          >
            {{ preset.label }}
            <span
              class="check"
              aria-hidden="true"
            />
          </button>
          <button
            type="button"
            class="row"
            :aria-pressed="picking"
            @click="picking = true"
          >
            Свой период
            <span class="value">
              {{ start && end ? rangeLabel(start, end) : '' }}
              <span
                class="check"
                aria-hidden="true"
              />
            </span>
          </button>
        </div>

        <template v-if="picking">
          <RangeCalendar
            class="range-calendar"
            :entry="start"
            :exit="end"
            :is-open="false"
            :others="[]"
            :today="today"
            @pick="pickDate"
          />
          <div class="actions">
            <button
              type="button"
              class="primary"
              :disabled="!start || !end"
              @click="applyCustom"
            >
              Показать
            </button>
          </div>
        </template>
      </div>
    </BottomSheet>
  </div>
</template>

<style scoped>
.stays-filter {
  display: flex;
  gap: 8px;
}

.filter-btn {
  position: relative;
  display: flex;
  flex: 1 1 0;
  min-width: 0;
  height: 40px;
  min-height: 0;
  gap: 8px;
  align-items: center;
  padding: 0 12px;
  border: none;
  border-radius: 12px;
  background: var(--surface);
  color: var(--text);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}

.filter-btn svg {
  flex: none;
  width: 18px;
  height: 18px;
  fill: none;
  stroke: var(--muted);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.filter-btn.active svg {
  stroke: var(--accent);
}

.filter-btn.active .text {
  color: var(--accent);
}

.filter-btn:has(select:focus-visible) {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chevron {
  flex: none;
  width: 7px;
  height: 7px;
  margin: -4px 2px 0;
  border-right: 2px solid var(--faint);
  border-bottom: 2px solid var(--faint);
  transform: rotate(45deg);
}

.filter-btn select {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: 0;
  border: none;
  opacity: 0;
  font-size: 16px;
  cursor: pointer;
  appearance: none;
}

.body {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  padding: 8px 16px calc(16px + env(safe-area-inset-bottom));
  overflow-y: auto;
  overscroll-behavior: contain;
}

.body > * {
  flex: none;
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

.value {
  display: flex;
  gap: 12px;
  align-items: center;
  color: var(--muted);
}

/* Галочка у выбранного; место под неё есть всегда, чтобы подписи не сдвигались. */
.check {
  flex: none;
  width: 7px;
  height: 13px;
  margin: -3px 4px 0;
  border-right: 2px solid transparent;
  border-bottom: 2px solid transparent;
  transform: rotate(45deg);
}

.row[aria-pressed='true'] .check {
  border-color: var(--accent);
}

.range-calendar {
  margin-top: 8px;
}

.actions {
  padding-top: 12px;
}

.primary {
  width: 100%;
  min-height: 50px;
  border-radius: 14px;
  font-size: 17px;
  font-weight: 600;
}
</style>
