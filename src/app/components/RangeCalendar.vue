<script setup lang="ts">
import { computed, ref } from 'vue'
import { addMonths, fromDayNumber, toDayNumber } from '../../domain/dates'
import type { CalendarDate, Stay } from '../../domain/types'
import { countryName } from '../format'

const props = defineProps<{
  entry: CalendarDate | ''
  exit: CalendarDate | ''
  /** «Я ещё там» — выбирается только въезд. */
  isOpen: boolean
  /** Остальные пребывания: их дни заняты. */
  others: Stay[]
  today: CalendarDate
}>()

const emit = defineEmits<{ pick: [date: CalendarDate] }>()

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const monthName = new Intl.DateTimeFormat('ru', { month: 'long', timeZone: 'UTC' })

/** Первое число показанного месяца; открывается на месяце въезда. */
const month = ref(`${(props.entry || props.exit || props.today).slice(0, 7)}-01`)

const title = computed(() => {
  const name = monthName.format(new Date(`${month.value}T00:00:00Z`))
  return `${name[0]?.toUpperCase()}${name.slice(1)} ${month.value.slice(0, 4)}`
})

function shift(months: number) {
  month.value = addMonths(month.value, months)
}

function jumpTo(event: Event) {
  const value = (event.target as HTMLInputElement).value
  if (/^\d{4}-\d{2}$/.test(value)) month.value = `${value}-01`
}

function openMonthPicker(event: Event) {
  try {
    ;(event.target as HTMLInputElement).showPicker?.()
  } catch {
    // showPicker недоступен — остаётся нативное поведение поля
  }
}

/**
 * День занят, если он внутри другого пребывания. Края — нет: выезд в день чужого въезда и въезд
 * в день чужого выезда — это стык. Открытое пребывание занимает всё после своего въезда.
 */
function isBusy(date: CalendarDate) {
  return props.others.some((s) => s.entry < date && (s.exit === null || date < s.exit))
}

const monthStart = computed(() => toDayNumber(month.value))
const monthEnd = computed(() => toDayNumber(addMonths(month.value, 1)) - 1)

/** Всегда шесть недель — высота календаря не меняется от месяца к месяцу. */
const cells = computed(() => {
  const lead = (new Date(`${month.value}T00:00:00Z`).getUTCDay() + 6) % 7
  const end = props.isOpen ? props.entry : props.exit
  return Array.from({ length: 42 }, (_, i) => {
    const day = monthStart.value - lead + i
    if (day < monthStart.value || day > monthEnd.value) return { key: `blank-${i}`, date: null }
    const date = fromDayNumber(day)
    const column = i % 7
    const isStart = date === props.entry
    const isEnd = date === end
    const inRange = Boolean(props.entry && end && date >= props.entry && date <= end)
    return {
      key: date,
      date,
      label: day - monthStart.value + 1,
      busy: isBusy(date),
      today: date === props.today,
      isStart,
      isEnd,
      inRange,
      // Полоса диапазона скругляется на краях недели и месяца.
      rowStart: column === 0 || day === monthStart.value,
      rowEnd: column === 6 || day === monthEnd.value,
    }
  })
})

/** «Заняты: 1–10 Испания, 20–31 Франция» — пребывания, которые задевают месяц. */
const busyNote = computed(() => {
  const parts = props.others
    .filter((s) => toDayNumber(s.entry) <= monthEnd.value && (s.exit === null || toDayNumber(s.exit) >= monthStart.value))
    .sort((a, b) => a.entry.localeCompare(b.entry))
    .map((s) => {
      const from = Math.max(toDayNumber(s.entry), monthStart.value) - monthStart.value + 1
      const to = Math.min(s.exit === null ? monthEnd.value : toDayNumber(s.exit), monthEnd.value) - monthStart.value + 1
      return `${from === to ? from : `${from}–${to}`} ${countryName(s.country)}`
    })
  return parts.length ? `Заняты: ${parts.join(', ')}` : ''
})
</script>

<template>
  <div class="calendar">
    <div class="head">
      <button
        type="button"
        class="arrow"
        aria-label="Предыдущий месяц"
        @click="shift(-1)"
      >
        <span class="chevron left" />
      </button>
      <label class="title">
        {{ title }}
        <input
          type="month"
          :value="month.slice(0, 7)"
          aria-label="Выбрать месяц"
          @change="jumpTo"
          @click="openMonthPicker"
        >
      </label>
      <button
        type="button"
        class="arrow"
        aria-label="Следующий месяц"
        @click="shift(1)"
      >
        <span class="chevron right" />
      </button>
    </div>

    <div
      class="grid weekdays"
      aria-hidden="true"
    >
      <span
        v-for="day in WEEKDAYS"
        :key="day"
      >{{ day }}</span>
    </div>

    <div class="grid days">
      <template
        v-for="cell in cells"
        :key="cell.key"
      >
        <span
          v-if="!cell.date"
          class="cell"
        />
        <button
          v-else
          type="button"
          class="cell day"
          :class="{
            busy: cell.busy,
            today: cell.today,
            start: cell.isStart,
            end: cell.isEnd,
            'in-range': cell.inRange,
            'row-start': cell.rowStart,
            'row-end': cell.rowEnd,
            single: cell.isStart && cell.isEnd,
          }"
          :disabled="cell.busy"
          :aria-pressed="cell.isStart || cell.isEnd"
          :aria-label="`${cell.label} ${title}${cell.busy ? ', занято' : ''}`"
          @click="emit('pick', cell.date)"
        >
          <span class="num">{{ cell.label }}</span>
        </button>
      </template>
    </div>

    <p class="busy-note">
      {{ busyNote }}
    </p>
  </div>
</template>

<style scoped>
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 40px;
}

.title {
  position: relative;
  font-size: 17px;
  font-weight: 600;
  cursor: pointer;
}

.title input {
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

.arrow {
  display: flex;
  width: 40px;
  height: 40px;
  min-height: 0;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: transparent;
}

.chevron {
  width: 9px;
  height: 9px;
  border-top: 2px solid var(--accent);
  border-left: 2px solid var(--accent);
}

.chevron.left {
  transform: translateX(2px) rotate(-45deg);
}

.chevron.right {
  transform: translateX(-2px) rotate(135deg);
}

.grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

.weekdays {
  margin: 4px 0 2px;
  color: var(--faint);
  font-size: 12px;
  font-weight: 600;
  text-align: center;
}

.cell {
  height: 38px;
}

.day {
  position: relative;
  display: flex;
  min-width: 0;
  min-height: 0;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  color: var(--text);
  font-size: 16px;
}

/* Полоса диапазона под днём; у концов — только к середине. */
.day.in-range::before {
  position: absolute;
  inset: 3px 0;
  background: var(--accent-soft);
  content: '';
}

.day.single::before {
  display: none;
}

.day.in-range.row-start::before {
  left: 4px;
  border-radius: 16px 0 0 16px;
}

.day.in-range.row-end::before {
  right: 4px;
  border-radius: 0 16px 16px 0;
}

.day.in-range.row-start.row-end::before {
  border-radius: 16px;
}

/* Концы диапазона — после правил краёв недели: полоса от них идёт от середины дня. */
.day.in-range.start::before {
  left: 50%;
  border-radius: 0;
}

.day.in-range.end::before {
  right: 50%;
  border-radius: 0;
}

.day.start.row-end::before,
.day.end.row-start::before {
  display: none;
}

.num {
  position: relative;
  display: flex;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.day.today .num {
  color: var(--accent);
  font-weight: 700;
}

.day.start .num,
.day.end .num {
  background: var(--accent);
  color: var(--accent-text);
  font-weight: 600;
}

.day.busy {
  color: var(--faint);
  text-decoration: line-through;
  cursor: default;
  opacity: 1;
}

.busy-note {
  min-height: 18px;
  margin: 4px 4px 0;
  color: var(--muted);
  font-size: 13px;
}
</style>
