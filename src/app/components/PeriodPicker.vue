<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { yearOf } from '../../domain/dates'
import type { PeriodChoice } from '../../domain/periods'
import type { CalendarDate } from '../../domain/types'

const props = defineProps<{ today: CalendarDate }>()
const model = defineModel<PeriodChoice>({ required: true })

const OPTIONS: { kind: PeriodChoice['kind']; label: string }[] = [
  { kind: 'currentYear', label: 'Текущий год' },
  { kind: 'last12Months', label: '12 месяцев' },
  { kind: 'previousYear', label: 'Прошлый год' },
  { kind: 'allTime', label: 'Всё время' },
  { kind: 'custom', label: 'Свой период' },
]

const customStart = ref(model.value.kind === 'custom' ? model.value.start : `${yearOf(props.today)}-01-01`)
const customEnd = ref(model.value.kind === 'custom' ? model.value.end : props.today)
const customInvalid = computed(() => !customStart.value || !customEnd.value || customStart.value > customEnd.value)

function select(kind: PeriodChoice['kind']) {
  model.value = kind === 'custom' ? { kind, start: customStart.value, end: customEnd.value } : { kind }
}

/** В модель попадает только корректный произвольный период; пока даты неверны, остаётся прежний. */
watch([customStart, customEnd], ([start, end]) => {
  if (model.value.kind === 'custom' && !customInvalid.value) model.value = { kind: 'custom', start, end }
})
</script>

<template>
  <div class="period-picker">
    <div
      class="options"
      role="group"
      aria-label="Период"
    >
      <button
        v-for="option in OPTIONS"
        :key="option.kind"
        type="button"
        :class="['option', { active: model.kind === option.kind }]"
        :aria-pressed="model.kind === option.kind"
        @click="select(option.kind)"
      >
        {{ option.label }}
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

.options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.option {
  min-height: 36px;
  padding: 4px 12px;
  border-color: var(--border);
  border-radius: 999px;
  background: transparent;
  color: var(--text);
}

.option.active {
  border-color: var(--accent);
  background: var(--accent);
  color: var(--accent-text);
}

.custom {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: end;
}

.custom .error {
  margin: 0;
  align-self: center;
}

.field {
  display: grid;
  gap: 4px;
  font-size: 0.85rem;
  color: var(--muted);
}

.field input {
  font-size: 1rem;
}
</style>
