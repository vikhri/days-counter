<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { isCalendarDate } from '../../domain/dates'
import type { CalendarDate, Stay } from '../../domain/types'
import { ValidationFailed, type StayInput } from '../api'
import CountryFlag from '../components/CountryFlag.vue'
import ScreenHeader from '../components/ScreenHeader.vue'
import StayForm from '../components/StayForm.vue'
import StaySheet from '../components/StaySheet.vue'
import { countryName, formatDays, formatStayDates, stayErrorText, stayLength } from '../format'
import { useData } from '../store'
import { localToday } from '../today'

const { stays, createStay, updateStay, deleteStay } = useData()
const today = localToday()

/** Открытое — первым, остальные по въезду, новые сверху. */
const sorted = computed(() =>
  [...stays.value].sort((a, b) => Number(b.exit === null) - Number(a.exit === null) || b.entry.localeCompare(a.entry)),
)

/** Даты из ссылки «Заполнить» на Обзоре: форма добавления открывается с ними. */
function draftFromQuery(): { entry: CalendarDate; exit: CalendarDate } | undefined {
  const { entry, exit } = useRoute().query
  return isCalendarDate(entry) && isCalendarDate(exit) && entry <= exit ? { entry, exit } : undefined
}

const draft = ref(draftFromQuery())
if (draft.value) void useRouter().replace({ query: {} })

const sheetOpen = ref(Boolean(draft.value))
const sheet = ref<InstanceType<typeof StaySheet> | null>(null)

function openSheet() {
  actionError.value = ''
  sheetOpen.value = true
}

function closeSheet() {
  sheetOpen.value = false
  draft.value = undefined
  actionError.value = ''
}

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
  if (await run(() => createStay(input))) sheet.value?.close()
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

const filterOpen = ref(false)
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
    <ScreenHeader title="Поездки">
      <button
        type="button"
        class="accent"
        aria-haspopup="dialog"
        aria-label="Новая поездка"
        title="Новая поездка"
        @click="openSheet"
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </ScreenHeader>

    <p
      v-if="actionError && !sheetOpen"
      class="error"
      role="alert"
    >
      {{ actionError }}
    </p>

    <StaySheet
      v-if="sheetOpen"
      ref="sheet"
      :draft="draft"
      :stays="stays"
      :today="today"
      :busy="busy"
      :error="actionError"
      @submit="add"
      @close="closeSheet"
    />

    <div
      v-if="stays.length"
      class="filter-row"
    >
      <button
        type="button"
        class="icon-btn"
        :class="{ active: hasFilter }"
        :aria-expanded="filterOpen"
        aria-controls="stays-filter"
        aria-label="Фильтр"
        title="Фильтр"
        @click="filterOpen = !filterOpen"
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M3 4h18l-7 8.5V19l-4 2v-8.5z" />
        </svg>
      </button>
    </div>

    <div
      v-if="stays.length && filterOpen"
      id="stays-filter"
      class="card filter"
    >
      <label class="field country-filter">
        Страна
        <select v-model="filterCountry">
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
      </label>
      <div class="dates">
        <label class="field">
          С даты
          <input
            v-model="filterFrom"
            type="date"
          >
        </label>
        <label class="field">
          По дату
          <input
            v-model="filterTo"
            type="date"
          >
        </label>
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

    <div
      v-if="!sorted.length"
      class="card empty"
    >
      <p class="muted">
        Пока нет ни одного пребывания.
      </p>
      <button
        type="button"
        aria-haspopup="dialog"
        @click="openSheet"
      >
        Добавить первое
      </button>
    </div>

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

.empty {
  display: grid;
  gap: 12px;
  justify-items: start;
}

.empty p {
  margin: 0;
}

.filter-row {
  display: flex;
  justify-content: flex-end;
  margin-bottom: -8px;
}

.icon-btn {
  display: flex;
  width: 36px;
  height: 36px;
  min-height: 0;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--muted);
}

.icon-btn[aria-expanded='true'],
.icon-btn.active {
  color: var(--accent);
}

.icon-btn.active svg {
  fill: currentColor;
}

.icon-btn svg {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.filter {
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

.field input,
.field select {
  font-size: 1rem;
}

.country-filter {
  flex: 1 1 160px;
  min-width: 0;
}

.country-filter select {
  min-width: 0;
  min-height: 40px;
  padding: 6px 10px;
  border: 1px solid var(--separator);
  border-radius: 10px;
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
  color: var(--warning-text);
  font-size: 0.75rem;
  font-weight: 500;
}

.row-actions {
  display: flex;
  gap: 8px;
}
</style>
