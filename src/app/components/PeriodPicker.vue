<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { yearOf } from '../../domain/dates'
import { recentYears, type PeriodChoice } from '../../domain/periods'
import type { CalendarDate } from '../../domain/types'

const props = defineProps<{ today: CalendarDate }>()
const model = defineModel<PeriodChoice>({ required: true })

/** Годы — от сегодняшней даты. Произвольный период — узкий сегмент с иконкой. */
const years = computed(() => recentYears(props.today))

const customStart = ref(model.value.kind === 'custom' ? model.value.start : `${yearOf(props.today)}-01-01`)
const customEnd = ref(model.value.kind === 'custom' ? model.value.end : props.today)
const customInvalid = computed(() => !customStart.value || !customEnd.value || customStart.value > customEnd.value)

function selectYear(year: number) {
  model.value = { kind: 'year', year }
}

function selectCustom() {
  model.value = { kind: 'custom', start: customStart.value, end: customEnd.value }
}

/** В модель попадает только корректный произвольный период; пока даты неверны, остаётся прежний. */
watch([customStart, customEnd], ([start, end]) => {
  if (model.value.kind === 'custom' && !customInvalid.value) model.value = { kind: 'custom', start, end }
})
</script>

<template>
  <div class="period-picker">
    <div
      class="segments"
      role="group"
      aria-label="Период"
    >
      <button
        v-for="year in years"
        :key="year"
        type="button"
        class="segment"
        :aria-pressed="model.kind === 'year' && model.year === year"
        @click="selectYear(year)"
      >
        {{ year }}
      </button>
      <button
        type="button"
        class="segment custom-segment"
        :aria-pressed="model.kind === 'custom'"
        aria-label="Свой период"
        title="Свой период"
        @click="selectCustom"
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
      </button>
    </div>
    <div
      v-if="model.kind === 'custom'"
      class="custom"
    >
      <label class="field">
        С
        <input
          v-model="customStart"
          type="date"
        >
      </label>
      <label class="field">
        По
        <input
          v-model="customEnd"
          type="date"
        >
      </label>
      <p
        v-if="customInvalid"
        class="error"
      >
        Начало периода позже конца
      </p>
    </div>
  </div>
</template>

<style scoped>
.period-picker {
  display: grid;
  gap: 10px;
}

.segments {
  display: flex;
  padding: 2px;
  border-radius: 10px;
  background: var(--fill);
}

.segment {
  flex: 1 1 0;
  min-width: 0;
  min-height: 32px;
  padding: 0 4px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--muted);
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
}

.segment[aria-pressed='true'] {
  background: var(--segment);
  box-shadow: var(--segment-shadow);
  color: var(--text);
  font-weight: 600;
}

.custom-segment {
  display: flex;
  flex: 0 0 44px;
  align-items: center;
  justify-content: center;
}

.custom-segment svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.custom {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.custom .error {
  grid-column: 1 / -1;
  margin: 0;
}

.field {
  display: grid;
  gap: 4px;
  min-width: 0;
  font-size: 13px;
  color: var(--muted);
}

.field input {
  width: 100%;
  min-width: 0;
  border: none;
  background: var(--surface);
  font-size: 1rem;
}
</style>
