<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Stay } from '../../domain/types'
import { ValidationFailed, type StayInput } from '../api'
import CountryFlag from '../components/CountryFlag.vue'
import StayForm from '../components/StayForm.vue'
import { countryName, formatDays, formatStayDates, stayErrorText, stayLength } from '../format'
import { useData } from '../store'
import { localToday } from '../today'

const { stays, settings, createStay, updateStay, deleteStay, setSchengen } = useData()
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

function toggleSchengen(event: Event) {
  run(() => setSchengen((event.target as HTMLInputElement).checked))
}

const isPlanned = (stay: Stay) => stay.entry > today || (stay.exit !== null && stay.exit > today)
</script>

<template>
  <section class="stays">
    <header class="head">
      <h1>Пребывания</h1>
      <label class="check">
        <input
          type="checkbox"
          :checked="settings.schengen"
          :disabled="busy"
          @change="toggleSchengen"
        >
        Считать Шенген 90/180
      </label>
    </header>

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

    <p
      v-if="!sorted.length"
      class="muted"
    >
      Пока нет ни одного пребывания.
    </p>

    <ul
      v-else
      class="list"
    >
      <li
        v-for="stay in sorted"
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

.head {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  align-items: baseline;
  justify-content: space-between;
}

.check {
  display: flex;
  gap: 6px;
  align-items: center;
}

h2 {
  margin: 0 0 10px;
  font-size: 1rem;
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
