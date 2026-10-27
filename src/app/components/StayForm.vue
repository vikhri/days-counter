<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import type { CalendarDate, Stay } from '../../domain/types'
import { validateStay } from '../../domain/validation'
import type { StayInput } from '../api'
import { COUNTRY_OPTIONS, findCountryByName } from '../countries'
import { countryName, stayErrorText, stayWarningText } from '../format'

const props = defineProps<{
  /** Редактируемое пребывание; без него форма добавляет новое. */
  stay?: Stay
  /** Даты, которыми заполнить новое пребывание. */
  draft?: { entry: CalendarDate; exit: CalendarDate }
  stays: Stay[]
  today: CalendarDate
  submitLabel: string
  busy: boolean
}>()

const emit = defineEmits<{ submit: [input: StayInput]; cancel: [] }>()

const listId = useId()
const countryText = ref(props.stay ? countryName(props.stay.country) : '')
const entry = ref(props.stay?.entry ?? props.draft?.entry ?? '')
const exit = ref(props.stay?.exit ?? props.draft?.exit ?? '')
const isOpen = ref(props.stay?.exit === null)

const country = computed(() => findCountryByName(countryText.value))

const input = computed<StayInput | null>(() => {
  if (!country.value || !entry.value) return null
  if (!isOpen.value && !exit.value) return null
  return { country: country.value, entry: entry.value, exit: isOpen.value ? null : exit.value }
})

const validation = computed(() =>
  input.value ? validateStay({ id: props.stay?.id ?? '', ...input.value }, props.stays, props.today) : null,
)

const canSubmit = computed(() => input.value !== null && validation.value?.errors.length === 0 && !props.busy)

function submit() {
  if (canSubmit.value && input.value) emit('submit', input.value)
}
</script>

<template>
  <form
    class="stay-form"
    @submit.prevent="submit"
  >
    <div class="fields">
      <label class="field country">
        Страна
        <input
          v-model="countryText"
          :list="listId"
          autocomplete="off"
          placeholder="Начните вводить"
          required
        >
      </label>
      <datalist :id="listId">
        <option
          v-for="c in COUNTRY_OPTIONS"
          :key="c.code"
          :value="c.name"
        />
      </datalist>
      <label class="field">
        Въезд
        <input
          v-model="entry"
          type="date"
          required
        >
      </label>
      <label class="field">
        Выезд
        <input
          v-model="exit"
          type="date"
          :disabled="isOpen"
          :required="!isOpen"
        >
      </label>
      <label class="check">
        <input
          v-model="isOpen"
          type="checkbox"
        >
        Сейчас здесь
      </label>
    </div>

    <ul
      v-if="(countryText && !country) || validation?.errors.length || validation?.warnings.length"
      class="messages"
    >
      <li
        v-if="countryText && !country"
        class="hint"
      >
        Выберите страну из списка
      </li>
      <li
        v-for="error in validation?.errors"
        :key="error.code + ('with' in error ? error.with.id : '')"
        class="error"
      >
        {{ stayErrorText(error) }}
      </li>
      <li
        v-for="warning in validation?.warnings"
        :key="warning.code"
        class="warning"
      >
        {{ stayWarningText(warning) }}
      </li>
    </ul>

    <div class="actions">
      <button
        type="submit"
        :disabled="!canSubmit"
      >
        {{ submitLabel }}
      </button>
      <button
        v-if="stay"
        type="button"
        class="secondary"
        @click="emit('cancel')"
      >
        Отмена
      </button>
    </div>
  </form>
</template>

<style scoped>
.stay-form {
  display: grid;
  gap: 10px;
}

.fields {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: end;
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

.country {
  flex: 1 1 200px;
}

.check {
  display: flex;
  gap: 6px;
  align-items: center;
  min-height: 40px;
}

.messages {
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 0.9rem;
}

.actions {
  display: flex;
  gap: 8px;
}
</style>
