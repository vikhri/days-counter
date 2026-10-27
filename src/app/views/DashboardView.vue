<script setup lang="ts">
import { computed, ref } from 'vue'
import { countDays, type PeriodChoice } from '../../domain/counting'
import { toDayNumber, yearOf } from '../../domain/dates'
import { RESIDENCY_THRESHOLD, russiaStatus } from '../../domain/russia'
import { SCHENGEN_LIMIT, schengenStatus } from '../../domain/schengen'
import type { CalendarDate, CountryCode } from '../../domain/types'
import type { Settings } from '../api'
import CountryFlag from '../components/CountryFlag.vue'
import PeriodPicker from '../components/PeriodPicker.vue'
import ScreenHeader from '../components/ScreenHeader.vue'
import { countryColor } from '../countryColors'
import {
  countryName,
  dayWord,
  formatDateRange,
  formatDayMonth,
  formatDays,
  formatShortDate,
  formatVisits,
} from '../format'
import { useData } from '../store'
import { localToday } from '../today'

/** С какого запаса статус становится «Почти порог». */
const LOW_ALLOWANCE = 30

const { stays, settings, updateSettings } = useData()
const today = localToday()

const period = ref<PeriodChoice>({ kind: 'currentYear' })
const editing = ref(false)
const settingsError = ref('')
const openCountry = ref<string | null>(null)

const count = computed(() => countDays(stays.value, period.value, today))
const periodDays = computed(() => toDayNumber(count.value.range.end) - toDayNumber(count.value.range.start) + 1)

function toggleCountry(code: string) {
  openCountry.value = openCountry.value === code ? null : code
}

interface Visit {
  id: string
  /** Часть пребывания внутри периода; открытое — по сегодня. */
  first: CalendarDate
  last: CalendarDate
  days: number
}

const visits = computed(() => {
  const { start, end } = count.value.range
  const byCountry = new Map<CountryCode, Visit[]>()
  for (const stay of [...stays.value].sort((a, b) => a.entry.localeCompare(b.entry))) {
    const stayEnd = stay.exit ?? today
    if (stay.entry > end || stayEnd < start) continue
    const first = stay.entry > start ? stay.entry : start
    const last = stayEnd < end ? stayEnd : end
    const visit = { id: stay.id, first, last, days: toDayNumber(last) - toDayNumber(first) + 1 }
    byCountry.set(stay.country, [...(byCountry.get(stay.country) ?? []), visit])
  }
  return byCountry
})

/** «1 янв – 28 фев»; визит, который идёт сейчас, — «1 сен – сегодня». */
function visitDates({ first, last }: Visit) {
  const withYear = yearOf(first) !== yearOf(last) || yearOf(last) !== yearOf(today)
  const from = formatShortDate(first, withYear)
  if (last === today) return first === today ? 'сегодня' : `${from} – сегодня`
  return first === last ? from : `${from} – ${formatShortDate(last, withYear)}`
}

/** Доля от дней периода; меньше процента, но не ноль — «<1%». */
function share(days: number) {
  const percent = Math.round((days / periodDays.value) * 100)
  return percent === 0 && days > 0 ? '<1%' : `${percent}%`
}

/** Полоса долей: отрезки растут пропорционально дням, неуказанные — заливкой в конце. */
const shareBar = computed(() => {
  const segments = count.value.countries.map((c) => ({ key: c.country, days: c.days, color: countryColor(c.country) }))
  if (count.value.unspecifiedDays) segments.push({ key: '', days: count.value.unspecifiedDays, color: 'var(--fill)' })
  return segments
})
const schengen = computed(() => schengenStatus(stays.value, today))
const russia = computed(() => russiaStatus(stays.value, today))

const schengenOver = computed(() => schengen.value.used - SCHENGEN_LIMIT)
const schengenShare = computed(() => `${Math.min(100, (schengen.value.used / SCHENGEN_LIMIT) * 100)}%`)

/** Один статус карточки: бейдж и пояснение справа от «N из 183». */
const residency = computed(() => {
  const { year, resident, unreachable, allowance } = russia.value
  if (resident) return { badge: 'Резидент', tone: 'danger', lead: 'порог превышен', note: `вы резидент РФ за ${year} год` }
  if (unreachable) {
    return { badge: 'Не резидент', tone: 'success', lead: `${RESIDENCY_THRESHOLD} уже не набрать`, note: `за ${year} год вы точно не резидент` }
  }
  if (allowance === 0) return { badge: 'На пороге', tone: 'danger', lead: 'больше нельзя', note: 'следующий день в России сделает вас резидентом' }
  const low = allowance <= LOW_ALLOWANCE
  return { badge: low ? 'Почти порог' : 'В норме', tone: low ? 'warning' : 'success', lead: `ещё ${formatDays(allowance)}`, note: 'можно провести в России' }
})

const planLine = computed(() => {
  const { resident, unreachable, planned } = russia.value
  if (!planned || resident || unreachable) return null
  const total = `${planned.days} из ${RESIDENCY_THRESHOLD} к ${formatDayMonth(planned.until)}`
  return planned.resident
    ? { text: `С учётом планов порог будет превышен — ${total}`, over: true }
    : { text: `С учётом планов запас — ещё ${formatDays(planned.allowance)}: ${total}`, over: false }
})

const gapText = computed(() => {
  const gap = count.value.longestGap
  if (!gap) return 'все дни периода заполнены'
  const withYear = yearOf(gap.start) !== yearOf(gap.end) || yearOf(gap.end) !== yearOf(today)
  const start = formatShortDate(gap.start, withYear)
  return gap.start === gap.end ? `без поездок ${start}` : `без поездок с ${start} по ${formatShortDate(gap.end, withYear)}`
})

async function setVisible(key: keyof Settings, event: Event) {
  settingsError.value = ''
  try {
    await updateSettings({ [key]: (event.target as HTMLInputElement).checked })
  } catch (e) {
    settingsError.value = e instanceof Error ? e.message : String(e)
  }
}
</script>

<template>
  <section class="dashboard">
    <ScreenHeader title="Обзор">
      <button
        v-if="stays.length"
        type="button"
        :aria-pressed="editing"
        :aria-label="editing ? 'Готово' : 'Настроить карточки'"
        :title="editing ? 'Готово' : 'Настроить карточки'"
        @click="editing = !editing"
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
        </svg>
      </button>
    </ScreenHeader>

    <p
      v-if="!stays.length"
      class="card muted"
    >
      Пока нет ни одного пребывания.
      <RouterLink to="/stays">
        Добавить первое
      </RouterLink>
    </p>

    <template v-else>
      <p
        v-if="settingsError"
        class="error"
        role="alert"
      >
        Не удалось сохранить настройку: {{ settingsError }}
      </p>

      <div class="period">
        <PeriodPicker
          v-model="period"
          :today="today"
        />
        <p class="range">
          {{ formatDateRange(count.range) }} · {{ formatDays(periodDays) }}
        </p>
      </div>

      <div
        v-if="settings.showRussia || editing"
        :class="['card', 'residency', { hidden: !settings.showRussia }]"
      >
        <div class="card-head">
          <h2>Резидентство РФ · {{ russia.year }}</h2>
          <span
            class="badge"
            :class="residency.tone"
          >
            <span
              class="dot"
              aria-hidden="true"
            />
            {{ residency.badge }}
          </span>
        </div>
        <label
          v-if="editing"
          class="toggle"
        >
          <input
            type="checkbox"
            :checked="settings.showRussia"
            @change="setVisible('showRussia', $event)"
          >
          Показывать
        </label>
        <div class="residency-main">
          <p class="big">
            {{ russia.days }}<span class="of"> из {{ RESIDENCY_THRESHOLD }}</span>
          </p>
          <p class="lead">
            <strong>{{ residency.lead }}</strong>
            {{ residency.note }}
          </p>
        </div>
        <p
          v-if="planLine"
          class="plan"
        >
          <svg
            viewBox="0 0 24 24"
            :class="{ over: planLine.over }"
            aria-hidden="true"
          >
            <path d="M12 3 2 20h20z" />
            <path d="M12 10v4M12 17h.01" />
          </svg>
          {{ planLine.text }}
        </p>
        <p class="footnote muted">
          Выезды на лечение и обучение не учтены.
        </p>
      </div>

      <div class="tiles">
        <div
          v-if="settings.showSchengen || editing"
          :class="['card', 'tile', { hidden: !settings.showSchengen }]"
        >
          <h2>Шенген 90/180</h2>
          <label
            v-if="editing"
            class="toggle"
          >
            <input
              type="checkbox"
              :checked="settings.showSchengen"
              @change="setVisible('showSchengen', $event)"
            >
            Показывать
          </label>
          <p class="mid">
            {{ schengen.used }}<span class="of"> из {{ SCHENGEN_LIMIT }}</span>
          </p>
          <div
            class="bar"
            :class="{ over: schengenOver > 0 }"
          >
            <div
              class="bar-fill"
              :style="{ width: schengenShare }"
            />
          </div>
          <p
            v-if="schengenOver > 0"
            class="note error"
          >
            Превышено на {{ formatDays(schengenOver) }}
          </p>
          <p
            v-else
            class="note muted"
          >
            Осталось {{ formatDays(schengen.left) }} в окне 180 дней
          </p>
        </div>

        <div class="card tile">
          <h2>Не указано</h2>
          <p class="mid">
            {{ count.unspecifiedDays }} <span class="of">{{ dayWord(count.unspecifiedDays) }}</span>
          </p>
          <p class="note muted">
            {{ gapText }}
          </p>
          <RouterLink
            v-if="count.longestGap"
            class="fill-link"
            :to="{ path: '/stays', query: { entry: count.longestGap.start, exit: count.longestGap.end } }"
          >
            Заполнить
          </RouterLink>
        </div>
      </div>

      <section>
        <h2 class="section-label">
          Страны за период
        </h2>
        <div class="card countries-card">
          <div
            class="share-bar"
            aria-hidden="true"
          >
            <span
              v-for="segment in shareBar"
              :key="segment.key"
              :style="{ flexGrow: segment.days, background: segment.color }"
            />
          </div>
          <ul class="countries">
            <li
              v-for="c in count.countries"
              :key="c.country"
              class="country"
            >
              <button
                type="button"
                class="country-head"
                :aria-expanded="openCountry === c.country"
                @click="toggleCountry(c.country)"
              >
                <CountryFlag
                  :code="c.country"
                  :size="32"
                />
                <span class="info">
                  <span class="name">{{ countryName(c.country) }}</span>
                  <span class="sub">
                    {{ formatVisits(visits.get(c.country)?.length ?? 0) }} · {{ share(c.days) }}
                    <span
                      v-if="c.futureDays"
                      class="future"
                    >· {{ c.futureDays }} в плане</span>
                  </span>
                </span>
                <span class="days">{{ c.days }} <span class="unit">дн</span></span>
                <span
                  class="chevron"
                  :class="{ open: openCountry === c.country }"
                  aria-hidden="true"
                />
              </button>
              <ul
                v-if="openCountry === c.country"
                class="visits"
              >
                <li
                  v-for="visit in visits.get(c.country)"
                  :key="visit.id"
                >
                  {{ visitDates(visit) }} · {{ visit.days }} дн
                </li>
              </ul>
            </li>
            <li
              v-if="count.unspecifiedDays"
              class="country"
            >
              <div class="country-head">
                <span
                  class="no-flag"
                  aria-hidden="true"
                />
                <span class="info">
                  <span class="name">Не указано</span>
                  <span class="sub">{{ share(count.unspecifiedDays) }}</span>
                </span>
                <span class="days">{{ count.unspecifiedDays }} <span class="unit">дн</span></span>
                <span
                  class="chevron-space"
                  aria-hidden="true"
                />
              </div>
            </li>
          </ul>
        </div>
      </section>
    </template>
  </section>
</template>

<style scoped>
.dashboard {
  display: grid;
  gap: 16px;
}

.card.hidden {
  opacity: 0.5;
}

.card-head {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

h2 {
  margin: 0;
  font-size: 1rem;
}

.toggle {
  display: flex;
  gap: 6px;
  align-items: center;
}

.card p {
  margin: 0;
}

.badge {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--fill);
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.badge .dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
}

.badge.warning {
  background: var(--warning-bg);
  color: var(--warning-text);
}

.badge.warning .dot {
  background: var(--warning);
}

.badge.danger {
  color: var(--danger);
}

.badge.success {
  color: var(--success-text);
}

.badge.success .dot {
  background: var(--success);
}

.residency h2 {
  font-size: 15px;
}

.residency .card-head {
  gap: 4px 8px;
}

.residency .toggle {
  margin-bottom: 8px;
}

.residency-main {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  justify-content: space-between;
}

.big,
.mid {
  font-family: var(--font-num);
  font-weight: 600;
  letter-spacing: -0.03em;
  line-height: 1.1;
  white-space: nowrap;
}

.big {
  font-size: 40px;
}

.mid {
  margin: 4px 0 !important;
  font-size: 26px;
}

.of {
  color: var(--muted);
  font-family: var(--font-ui);
  font-size: 15px;
  font-weight: 500;
  letter-spacing: normal;
}

.lead {
  flex: 1;
  min-width: 0;
  padding-bottom: 4px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.3;
  text-align: right;
}

.lead strong {
  display: block;
  color: var(--text);
  font-size: 15px;
  font-weight: 600;
}

.plan {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  margin-top: 12px !important;
  padding-top: 12px;
  border-top: 0.5px solid var(--separator);
  font-size: 14px;
}

.plan svg {
  flex: 0 0 18px;
  height: 18px;
  fill: none;
  stroke: var(--warning);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.plan svg.over {
  stroke: var(--danger);
}

.tiles {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.tile {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 14px;
}

/* Шенген скрыт — плитка «Не указано» одна и занимает весь ряд. */
.tile:only-child {
  grid-column: 1 / -1;
}

.tile h2 {
  color: var(--muted);
  font-size: 13px;
  font-weight: 600;
}

.tile .toggle {
  font-size: 13px;
}

.note {
  font-size: 13px;
  line-height: 1.3;
}

.fill-link {
  margin-top: auto;
  padding-top: 8px;
  color: var(--accent);
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
}

.bar {
  height: 6px;
  margin: 6px 0 8px;
  border-radius: 999px;
  background: var(--fill);
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: var(--accent);
}

.bar.over .bar-fill {
  background: var(--danger);
}

.footnote {
  margin-top: 10px !important;
  font-size: 12px;
}

.period {
  display: grid;
  gap: 8px;
}

.range {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
  text-align: center;
}

.section-label {
  margin: 0 0 6px 16px;
  color: var(--muted);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.countries-card {
  padding: 14px 16px 0;
}

.share-bar {
  display: flex;
  gap: 2px;
  height: 8px;
  margin-bottom: 4px;
  border-radius: 4px;
  overflow: hidden;
}

.share-bar span {
  flex-basis: 0;
  min-width: 2px;
}

.countries {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
}

.country + .country {
  border-top: 0.5px solid var(--separator);
}

.country-head {
  display: flex;
  width: 100%;
  min-height: 60px;
  gap: 12px;
  align-items: center;
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  color: var(--text);
  text-align: left;
}

.no-flag {
  flex: none;
  width: 32px;
  height: 32px;
  border: 1.5px dashed var(--faint);
  border-radius: 50%;
}

.info {
  display: grid;
  flex: 1;
  min-width: 0;
}

.name {
  overflow: hidden;
  font-size: 16px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sub {
  color: var(--muted);
  font-size: 13px;
}

.future {
  color: var(--warning-text);
}

.days {
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

.chevron,
.chevron-space {
  flex: none;
  width: 8px;
}

.chevron {
  height: 8px;
  border-right: 2px solid var(--faint);
  border-bottom: 2px solid var(--faint);
  transform: rotate(-45deg);
  transition: transform 0.15s;
}

.chevron.open {
  transform: rotate(45deg);
}

@media (prefers-reduced-motion: reduce) {
  .chevron {
    transition: none;
  }
}

/* Линия слева идёт от центра флага, текст визитов выровнен по названию страны. */
.visits {
  display: grid;
  gap: 6px;
  margin: 0 0 14px 15px;
  padding: 0 0 0 27px;
  border-left: 2px solid var(--separator);
  list-style: none;
  color: var(--muted);
  font-size: 14px;
}
</style>
