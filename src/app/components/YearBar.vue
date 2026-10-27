<script setup lang="ts">
import { computed } from 'vue'
import { toDayNumber, yearOf } from '../../domain/dates'
import { yearTimeline } from '../../domain/timeline'
import type { CalendarDate, CountryCode, Stay } from '../../domain/types'
import { countryColor } from '../countryColors'
import { countryName, formatDays } from '../format'

const props = defineProps<{ stays: Stay[]; today: CalendarDate }>()

const MONTH_LETTERS = ['Я', 'Ф', 'М', 'А', 'М', 'И', 'И', 'А', 'С', 'О', 'Н', 'Д']

const year = computed(() => yearOf(props.today))
const segments = computed(() => yearTimeline(props.stays, year.value, props.today))
const yearDays = computed(() => segments.value.reduce((sum, s) => sum + s.days, 0))
const share = (days: number) => `${(days / yearDays.value) * 100}%`

const bars = computed(() => {
  let offset = 0
  return segments.value.map((segment) => {
    const bar = {
      ...segment,
      left: share(offset),
      width: share(segment.days),
      color: segment.country ? countryColor(segment.country) : undefined,
    }
    offset += segment.days
    return bar
  })
})

/** Черта стоит посередине сегодняшнего дня; подпись у краёв года не вылезает за карточку. */
const todayPosition = computed(() => {
  const offset = toDayNumber(props.today) - toDayNumber(`${year.value}-01-01`) + 0.5
  const fraction = offset / yearDays.value
  return { left: share(offset), align: fraction < 0.08 ? 'start' : fraction > 0.92 ? 'end' : 'center' }
})

const months = computed(() =>
  MONTH_LETTERS.map((letter, i) => {
    const start = toDayNumber(`${year.value}-${String(i + 1).padStart(2, '0')}-01`)
    const next = i === 11 ? toDayNumber(`${year.value + 1}-01-01`) : toDayNumber(`${year.value}-${String(i + 2).padStart(2, '0')}-01`)
    return { key: i, letter, days: next - start }
  }),
)

/** Страны года по убыванию дней. */
const countries = computed(() => {
  const days = new Map<CountryCode, number>()
  for (const s of segments.value) if (s.country) days.set(s.country, (days.get(s.country) ?? 0) + s.days)
  return [...days].sort((a, b) => b[1] - a[1]).map(([code, total]) => ({ code, days: total, color: countryColor(code) }))
})

const hasPlan = computed(() => segments.value.some((s) => s.country && s.future))

const unspecifiedDays = computed(() => segments.value.reduce((sum, s) => sum + (s.country ? 0 : s.days), 0))

const summary = computed(() =>
  [
    ...countries.value.map((c) => `${countryName(c.code)} — ${formatDays(c.days)}`),
    ...(unspecifiedDays.value ? [`не указано — ${formatDays(unspecifiedDays.value)}`] : []),
  ].join(', '),
)
</script>

<template>
  <div class="card year-card">
    <div class="head">
      <h2>{{ year }} по дням</h2>
      <span class="length">{{ formatDays(yearDays) }}</span>
    </div>

    <div class="timeline">
      <span
        class="today-label"
        :class="todayPosition.align"
        :style="{ left: todayPosition.left }"
        aria-hidden="true"
      >сегодня</span>
      <div
        class="track"
        role="img"
        :aria-label="`${year} год: ${summary}`"
      >
        <span
          v-for="bar in bars"
          :key="bar.start"
          class="segment"
          :class="{ future: bar.future && bar.country }"
          :style="{ left: bar.left, width: bar.width, '--segment-color': bar.color }"
        />
      </div>
      <span
        class="today-line"
        :style="{ left: todayPosition.left }"
        aria-hidden="true"
      />
    </div>

    <div
      class="months"
      aria-hidden="true"
    >
      <span
        v-for="month in months"
        :key="month.key"
        :style="{ flexGrow: month.days }"
      >{{ month.letter }}</span>
    </div>

    <ul
      v-if="countries.length"
      class="legend"
    >
      <li
        v-for="c in countries"
        :key="c.code"
      >
        <span
          class="swatch"
          :style="{ '--segment-color': c.color }"
        />
        {{ countryName(c.code) }}
      </li>
      <li v-if="hasPlan">
        <span class="swatch future" />
        план
      </li>
    </ul>
  </div>
</template>

<style scoped>
.head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

h2 {
  margin: 0;
  font-size: 15px;
}

.length {
  color: var(--muted);
  font-size: 13px;
}

.timeline {
  position: relative;
  margin-top: 6px;
  padding-top: 18px;
}

.today-label {
  position: absolute;
  top: 0;
  color: var(--text);
  font-size: 11px;
  font-weight: 600;
  line-height: 14px;
  white-space: nowrap;
  transform: translateX(-50%);
}

.today-label.start {
  transform: translateX(-2px);
}

.today-label.end {
  transform: translateX(calc(-100% + 2px));
}

.track {
  position: relative;
  height: 28px;
  border-radius: 6px;
  background: var(--fill);
  overflow: hidden;
}

.segment {
  position: absolute;
  top: 0;
  bottom: 0;
  background: var(--segment-color, transparent);
}

/* План — штриховка с контуром цвета страны. */
.segment.future,
.swatch.future {
  background: repeating-linear-gradient(135deg, var(--segment-color) 0 1.5px, transparent 1.5px 5px);
  box-shadow: inset 0 0 0 1.5px var(--segment-color);
}

.today-line {
  position: absolute;
  top: 15px;
  bottom: -3px;
  width: 2px;
  margin-left: -1px;
  border-radius: 1px;
  background: var(--text);
}

.months {
  display: flex;
  margin-top: 6px;
  color: var(--faint);
  font-size: 11px;
  font-weight: 500;
}

.months span {
  flex-basis: 0;
  text-align: center;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
  color: var(--muted);
  font-size: 13px;
}

.legend li {
  display: flex;
  gap: 6px;
  align-items: center;
}

.swatch {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  background: var(--segment-color);
}

.swatch.future {
  --segment-color: var(--muted);
}
</style>
