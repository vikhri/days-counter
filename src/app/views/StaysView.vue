<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Stay } from '../../domain/types'
import { ValidationFailed, type StayInput } from '../api'
import CountryFlag from '../components/CountryFlag.vue'
import StayForm from '../components/StayForm.vue'
import { countryName, formatDays, formatStayDates, stayErrorText, stayLength } from '../format'
import { useData } from '../store'
import { localToday } from '../today'

const { stays, createStay, updateStay, deleteStay } = useData()
const today = localToday()

/** Открытое — первым, остальные по въезду, новые сверху. */
const sorted = computed(() =>
  [...stays.value].sort((a, b) => Number(b.exit === null) - Number(a.exit === null) || b.entry.localeCompare(a.entry)),
)

const addFormKey = ref(0)
const editingId = ref<string | null>(null)
const busy = ref(false)
const actionError = ref('')

async function run(action: () => Promise<void>): Promise<boolean> {
  busy.value = true
  actionError.value = ''
  try {
    await action()
    return true
  } catch (e) {
    actionError.value = e instanceof ValidationFailed ? e.errors.map(stayErrorText).join('. ') : String(e instanceof Error ? e.message : e)
    return false
  } finally {
    busy.value = false
  }
}

async function add(input: StayInput) {
  if (await run(() => createStay(input))) addFormKey.value++
}

async function save(id: string, input: StayInput) {
  if (await run(() => updateStay(id, input))) editingId.value = null
}

async function remove(stay: Stay) {
  if (window.confirm(`Удалить пребывание: ${countryName(stay.country)}, ${formatStayDates(stay)}?`)) {
    await run(() => deleteStay(stay.id))
  }
}

const isPlanned = (stay: Stay) => stay.entry > today || (stay.exit !== null && stay.exit > today)

const filterCountry = ref('')
const filterFrom = ref('')
const filterTo = ref('')

const countryOptions = computed(() =>
  [...new Set(stays.value.map((s) => s.country))].sort((a, b) => countryName(a).localeCompare(countryName(b), 'ru')),
)

const hasFilter = computed(() => Boolean(filterCountry.value || filterFrom.value || filterTo.value))

/** Пребывание попадает в период, если пересекается с ним; открытое тянется до сегодня. */
const filtered = computed(() =>
  sorted.value.filter(
    (stay) =>
      (!filterCountry.value || stay.country === filterCountry.value) &&
      (!filterFrom.value || (stay.exit ?? today) >= filterFrom.value) &&
      (!filterTo.value || stay.entry <= filterTo.value),
  ),
)

function resetFilter() {
  filterCountry.value = ''
  filterFrom.value = ''
  filterTo.value = ''
}
</script>

<template>
  <section class="stays">
    <p
      v-if="actionError"
      class="error"
      role="alert"
    >
      {{ actionError }}
    </p>

    <div class="card">
      <h2>Добавить</h2>
      <StayForm
        :key="addFormKey"
        :stays="stays"
        :today="today"
        :busy="busy"
        submit-label="Добавить"
        @submit="add"
      />
    </div>

    <div
      v-if="stays.length"
      class="card filter"
    >
      <select
        v-model="filterCountry"
        class="country-filter"
        aria-label="Страна"
      >
        <option value="">
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
      <div class="dates">
        <input
          v-model="filterFrom"
          type="date"
          aria-label="Дата с"
        >
        <input
          v-model="filterTo"
          type="date"
          aria-label="Дата по"
        >
      </div>
      <button
        v-if="hasFilter"
        type="button"
        class="secondary"
        @click="resetFilter"
      >
        Сбросить
      </button>
    </div>

    <p
      v-if="!sorted.length"
      class="muted"
    >
      Пока нет ни одного пребывания.
    </p>

    <p
      v-else-if="!filtered.length"
      class="muted"
    >
      По фильтру ничего не найдено.
    </p>

    <ul
      v-else
      class="list"
    >
      <li
        v-for="stay in filtered"
        :key="stay.id"
        class="card"
      >
        <StayForm
          v-if="editingId === stay.id"
          :stay="stay"
          :stays="stays"
          :today="today"
          :busy="busy"
          submit-label="Сохранить"
          @submit="save(stay.id, $event)"
          @cancel="editingId = null"
        />
        <div
          v-else
          class="row"
        >
          <CountryFlag :code="stay.country" />
          <div class="info">
            <div class="name">
              {{ countryName(stay.country) }}
              <span
                v-if="isPlanned(stay)"
                class="tag"
              >план</span>
            </div>
            <div class="muted">
              {{ formatStayDates(stay) }} · {{ formatDays(stayLength(stay, today)) }}
            </div>
          </div>
          <div class="row-actions">
            <button
              type="button"
              class="secondary"
              :disabled="busy"
              @click="editingId = stay.id"
            >
              Изменить
            </button>
            <button
              type="button"
              class="danger"
              :disabled="busy"
              @click="remove(stay)"
            >
              Удалить
            </button>
          </div>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.stays {
  display: grid;
  gap: 16px;
}


h2 {
  margin: 0 0 10px;
  font-size: 1rem;
}

.filter {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: end;
}

.country-filter {
  flex: 1 1 160px;
  min-width: 0;
  min-height: 40px;
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  font: inherit;
}

.dates {
  display: flex;
  flex: 0 0 auto;
  gap: 10px;
}

.dates input {
  width: 8.5rem;
  min-width: 0;
}

.list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  align-items: center;
}

.info {
  flex: 1 1 200px;
  min-width: 0;
}

.name {
  font-weight: 600;
}

.tag {
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--warning-bg);
  color: var(--warning);
  font-size: 0.75rem;
  font-weight: 500;
}

.row-actions {
  display: flex;
  gap: 8px;
}
</style>
