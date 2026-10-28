<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { isCalendarDate, toDayNumber, yearOf } from '../../domain/dates'
import { filterStays, type DateFilter } from '../../domain/stayFilter'
import { groupStays, type StayGroup } from '../../domain/stayGroups'
import type { CalendarDate, CountryCode, Stay } from '../../domain/types'
import { ValidationFailed, type StayInput } from '../api'
import CountryFlag from '../components/CountryFlag.vue'
import ScreenHeader from '../components/ScreenHeader.vue'
import StaySheet from '../components/StaySheet.vue'
import StaysFilter from '../components/StaysFilter.vue'
import SwipeRow from '../components/SwipeRow.vue'
import { countryName, formatDays, formatShortStay, stayErrorText, stayLength } from '../format'
import { useData } from '../store'
import { localToday } from '../today'

const { stays, createStay, updateStay, deleteWithUndo } = useData()
const today = localToday()

/** Даты из ссылки «Заполнить» на Обзоре: шторка добавления открывается с ними. */
function draftFromQuery(): { entry: CalendarDate; exit: CalendarDate } | undefined {
  const { entry, exit } = useRoute().query
  return isCalendarDate(entry) && isCalendarDate(exit) && entry <= exit ? { entry, exit } : undefined
}

const draft = ref(draftFromQuery())
if (draft.value) void useRouter().replace({ query: {} })

const sheetOpen = ref(Boolean(draft.value))
/** Пребывание в шторке; null — шторка добавляет новое. */
const editing = ref<Stay | null>(null)
const sheet = ref<InstanceType<typeof StaySheet> | null>(null)
const busy = ref(false)
const actionError = ref('')

function openSheet(stay: Stay | null = null) {
  actionError.value = ''
  editing.value = stay
  sheetOpen.value = true
}

function closeSheet() {
  sheetOpen.value = false
  editing.value = null
  draft.value = undefined
  actionError.value = ''
}

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

async function submit(input: StayInput) {
  const id = editing.value?.id
  if (await run(() => (id ? updateStay(id, input) : createStay(input)))) sheet.value?.close()
}

/** Строка с открытым свайпом; открытой может быть только одна. */
const swipedId = ref<string | null>(null)

function setSwiped(id: string, open: boolean) {
  if (open) swipedId.value = id
  else if (swipedId.value === id) swipedId.value = null
}

function removeEditing() {
  if (!editing.value) return
  deleteWithUndo(editing.value)
  sheet.value?.close()
}

const filterCountry = ref<CountryCode | null>(null)
const filterDates = ref<DateFilter>({ kind: 'any' })

const stayCountries = computed(() => [...new Set(stays.value.map((s) => s.country))])

const groups = computed(() =>
  groupStays(filterStays(stays.value, { country: filterCountry.value, dates: filterDates.value }, today), today),
)

function groupKey(group: StayGroup) {
  return group.kind === 'year' ? String(group.year) : group.kind
}

function groupTitle(group: StayGroup) {
  if (group.kind === 'now') return 'Сейчас'
  if (group.kind === 'planned') return 'Запланировано'
  return String(group.year)
}

/** «3 – 10 мая»; год — когда его не видно из группы. Открытое — «с 1 сен». */
function stayDates(stay: Stay, group: StayGroup) {
  return formatShortStay(stay, group.kind !== 'year' && yearOf(stay.entry) !== yearOf(today))
}

/** Сколько дней пребывания, которое идёт сейчас, уже прошло и сколько осталось. */
function progress(stay: Stay) {
  const passed = toDayNumber(today) - toDayNumber(stay.entry) + 1
  if (stay.exit === null) return { passed, total: null, left: null, share: null }
  const total = stayLength(stay, today)
  return { passed, total, left: total - passed, share: `${(passed / total) * 100}%` }
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
        @click="openSheet()"
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
      :key="editing?.id ?? 'new'"
      ref="sheet"
      :stay="editing ?? undefined"
      :draft="draft"
      :stays="stays"
      :today="today"
      :busy="busy"
      :error="actionError"
      @submit="submit"
      @delete="removeEditing"
      @close="closeSheet"
    />

    <StaysFilter
      v-if="stays.length"
      v-model:country="filterCountry"
      v-model:dates="filterDates"
      :countries="stayCountries"
      :today="today"
    />

    <div
      v-if="!stays.length"
      class="card empty"
    >
      <p class="muted">
        Пока нет ни одного пребывания.
      </p>
      <button
        type="button"
        aria-haspopup="dialog"
        @click="openSheet()"
      >
        Добавить первое
      </button>
    </div>

    <p
      v-else-if="!groups.length"
      class="muted"
    >
      По фильтру ничего не найдено.
    </p>

    <section
      v-for="group in groups"
      :key="groupKey(group)"
    >
      <h2 class="section-label">
        <span>{{ groupTitle(group) }}</span>
        <span v-if="group.kind === 'year'">{{ group.days }} дн</span>
      </h2>
      <ul class="card list">
        <li
          v-for="stay in group.stays"
          :key="stay.id"
        >
          <SwipeRow
            :open="swipedId === stay.id"
            @update:open="setSwiped(stay.id, $event)"
            @edit="openSheet(stay)"
            @delete="deleteWithUndo(stay)"
          >
            <div class="item">
              <button
                type="button"
                class="row"
                aria-haspopup="dialog"
                @click="openSheet(stay)"
              >
                <CountryFlag
                  :code="stay.country"
                  :size="36"
                />
                <span class="info">
                  <span class="name">
                    <span class="name-text">{{ countryName(stay.country) }}</span>
                    <span
                      v-if="group.kind === 'now'"
                      class="tag here"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
                        <circle
                          cx="12"
                          cy="9.5"
                          r="2.5"
                        />
                      </svg>
                      Вы здесь
                    </span>
                    <span
                      v-else-if="group.kind === 'planned'"
                      class="tag plan"
                    >план</span>
                  </span>
                  <span class="dates">{{ stayDates(stay, group) }}</span>
                </span>
                <span
                  v-if="group.kind === 'now'"
                  class="right"
                >
                  <span class="days">
                    {{ progress(stay).passed }}
                    <span class="unit">{{ progress(stay).total ? `из ${progress(stay).total}` : 'дн' }}</span>
                  </span>
                  <span class="left">{{ progress(stay).left === null ? 'по сегодня' : `ещё ${formatDays(progress(stay).left ?? 0)}` }}</span>
                </span>
                <span
                  v-else
                  class="days"
                >{{ stayLength(stay, today) }} <span class="unit">дн</span></span>
              </button>
              <div
                v-if="group.kind === 'now' && progress(stay).share"
                class="progress"
                aria-hidden="true"
              >
                <span :style="{ width: progress(stay).share ?? undefined }" />
              </div>
            </div>
          </SwipeRow>
        </li>
      </ul>
    </section>
  </section>
</template>

<style scoped>
/* Колонка не шире экрана: иначе её распирает непереносимый текст — подпись страны в фильтре. */
.stays {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
}

.empty {
  display: grid;
  gap: 12px;
  justify-items: start;
}

.empty p {
  margin: 0;
}

.list {
  margin: 0;
  padding: 0;
  overflow: hidden;
  list-style: none;
}

.item {
  padding: 0 16px;
}

/* Разделитель начинается от текста, как в нативных списках, и уезжает вместе со строкой. */
.list li + li .item {
  background: linear-gradient(var(--separator), var(--separator)) 64px 0 / calc(100% - 64px) 0.5px no-repeat;
}

/* Длинное название переносится, и строка растёт. */
.row {
  display: flex;
  width: 100%;
  min-height: 62px;
  gap: 12px;
  align-items: center;
  padding: 10px 0;
  border: none;
  border-radius: 0;
  background: transparent;
  color: var(--text);
  text-align: left;
}

.info {
  display: grid;
  flex: 1;
  min-width: 0;
}

/* Бейдж, которому не хватило места рядом с названием, уходит на следующую строку. */
.name {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 8px;
  align-items: center;
  min-width: 0;
  font-size: 16px;
  font-weight: 500;
}

/* Не больше двух строк, дальше — многоточие. */
.name-text {
  display: -webkit-box;
  min-width: 0;
  overflow: hidden;
  overflow-wrap: break-word;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}

.tag {
  display: inline-flex;
  flex: none;
  gap: 3px;
  align-items: center;
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.tag.here {
  background: var(--accent-soft);
  color: var(--accent);
}

.tag.here svg {
  width: 12px;
  height: 12px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.5;
}

.tag.plan {
  border: 1px dashed var(--faint);
  color: var(--muted);
}

.info .dates {
  color: var(--muted);
  font-size: 13px;
}

.right {
  display: grid;
  flex: none;
  justify-items: end;
}

.days {
  flex: none;
  font-family: var(--font-num);
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.02em;
  white-space: nowrap;
}

.unit {
  color: var(--muted);
  font-family: var(--font-ui);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: normal;
}

.left {
  color: var(--muted);
  font-size: 12px;
}

.progress {
  height: 3px;
  margin: -6px 0 10px 48px;
  border-radius: 2px;
  background: var(--fill);
  overflow: hidden;
}

.progress span {
  display: block;
  height: 100%;
  background: var(--accent);
}
</style>
