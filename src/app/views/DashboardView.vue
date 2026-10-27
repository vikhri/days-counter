<script setup lang="ts">
import { computed, ref } from 'vue'
import { countDays, type PeriodChoice } from '../../domain/counting'
import { toDayNumber } from '../../domain/dates'
import { RESIDENCY_THRESHOLD, russiaStatus } from '../../domain/russia'
import { SCHENGEN_LIMIT, schengenStatus } from '../../domain/schengen'
import type { Settings } from '../api'
import CountryFlag from '../components/CountryFlag.vue'
import PeriodPicker from '../components/PeriodPicker.vue'
import { countryName, formatDateRange, formatDays, formatShortStayDates } from '../format'
import { useData } from '../store'
import { localToday } from '../today'

/** С какого запаса подсказка становится жёлтой. */
const LOW_ALLOWANCE = 30

const { stays, settings, updateSettings } = useData()
const today = localToday()

const period = ref<PeriodChoice>({ kind: 'currentYear' })
const editing = ref(false)
const settingsError = ref('')
const openCountry = ref<string | null>(null)

const count = computed(() => countDays(stays.value, period.value, today))

function toggleCountry(code: string) {
  openCountry.value = openCountry.value === code ? null : code
}

function visitsIn(code: string) {
  const { start, end } = count.value.range
  const from = toDayNumber(start)
  const to = toDayNumber(end)
  return stays.value
    .filter((s) => s.country === code && s.entry <= end && (s.exit ?? today) >= start)
    .sort((a, b) => a.entry.localeCompare(b.entry))
    .map((stay) => {
      const first = Math.max(toDayNumber(stay.entry), from)
      const last = Math.min(toDayNumber(stay.exit ?? today), to)
      return { stay, days: last - first + 1 }
    })
}
const schengen = computed(() => schengenStatus(stays.value, today))
const russia = computed(() => russiaStatus(stays.value, today))

const schengenOver = computed(() => schengen.value.used - SCHENGEN_LIMIT)
const schengenShare = computed(() => `${Math.min(100, (schengen.value.used / SCHENGEN_LIMIT) * 100)}%`)

const russiaHint = computed(() => {
  const { year, resident, unreachable, allowance } = russia.value
  if (resident) return { text: `Порог превышен: вы резидент РФ за ${year} год`, tone: 'error' }
  if (unreachable) return { text: `До конца года ${RESIDENCY_THRESHOLD} дня уже не набрать — за ${year} год вы точно не резидент`, tone: 'success' }
  if (allowance === 0) return { text: 'Больше нельзя: следующий день в России сделает вас резидентом', tone: 'error' }
  return { text: `Можно провести в России ещё ${formatDays(allowance)}`, tone: allowance <= LOW_ALLOWANCE ? 'warning' : '' }
})

const plannedHint = computed(() => {
  const { resident, unreachable, planned } = russia.value
  if (!planned || resident || unreachable) return null
  return planned.resident
    ? { text: 'С учётом запланированных поездок порог будет превышен', tone: 'error' }
    : { text: `С учётом запланированных поездок — ещё ${formatDays(planned.allowance)}`, tone: 'muted' }
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

      <div class="card">
        <PeriodPicker
          v-model="period"
          :today="today"
        />
        <p class="range muted">
          {{ formatDateRange(count.range) }}
        </p>

        <p
          v-if="!count.countries.length"
          class="muted"
        >
          За этот период поездок нет.
        </p>
        <ul
          v-else
          class="countries"
        >
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
              <CountryFlag :code="c.country" />
              <span class="name">{{ countryName(c.country) }}</span>
              <span class="days">
                {{ formatDays(c.days) }}
                <span
                  v-if="c.futureDays"
                  class="future"
                >включая {{ c.futureDays }} будущих</span>
              </span>
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
                v-for="visit in visitsIn(c.country)"
                :key="visit.stay.id"
              >
                {{ formatShortStayDates(visit.stay) }} · {{ formatDays(visit.days) }}
              </li>
            </ul>
          </li>
        </ul>

        <p
          v-if="count.unspecifiedDays"
          class="unspecified muted"
        >
          Не указано: {{ formatDays(count.unspecifiedDays) }}
        </p>
      </div>

      <div
        v-if="settings.showRussia || editing"
        :class="['card', { hidden: !settings.showRussia }]"
      >
        <div class="card-head">
          <h2>Резидентство РФ за {{ russia.year }} год</h2>
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
        </div>
        <p class="big">
          {{ russia.days }} <span class="muted">из {{ RESIDENCY_THRESHOLD }}</span>
        </p>
        <p :class="russiaHint.tone">
          {{ russiaHint.text }}
        </p>
        <p
          v-if="plannedHint"
          :class="plannedHint.tone"
        >
          {{ plannedHint.text }}
        </p>
        <p class="footnote muted">
          Выезды на лечение и обучение не учтены.
        </p>
      </div>

      <div
        v-if="settings.showSchengen || editing"
        :class="['card', { hidden: !settings.showSchengen }]"
      >
        <div class="card-head">
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
        </div>
        <p class="big">
          {{ schengen.used }} <span class="muted">из {{ SCHENGEN_LIMIT }}</span>
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
          class="error"
        >
          Превышено на {{ formatDays(schengenOver) }}
        </p>
        <p
          v-else
          class="muted"
        >
          Осталось {{ formatDays(schengen.left) }} в окне последних 180 дней
        </p>
      </div>

      <div class="settings-row">
        <button
          type="button"
          class="icon-btn"
          :aria-pressed="editing"
          :aria-label="editing ? 'Готово' : 'Настроить'"
          :title="editing ? 'Готово' : 'Настроить'"
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
      </div>
    </template>
  </section>
</template>

<style scoped>
.dashboard {
  display: grid;
  gap: 16px;
}

.settings-row {
  display: flex;
  justify-content: flex-end;
}

.icon-btn {
  display: flex;
  width: 28px;
  height: 28px;
  min-height: 0;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--muted);
  opacity: 0.5;
}

.icon-btn[aria-pressed='true'] {
  color: var(--accent);
  opacity: 1;
}

.icon-btn svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
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

.big {
  font-family: var(--font-num);
  font-size: 2rem;
  font-weight: 600;
  letter-spacing: -0.03em;
  line-height: 1.2;
}

.big .muted {
  font-family: var(--font-ui);
  font-size: 1rem;
  font-weight: 400;
  letter-spacing: normal;
}

.bar {
  height: 8px;
  margin: 8px 0;
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
  font-size: 0.85rem;
}

.range {
  margin: 10px 0 !important;
  font-size: 0.9rem;
}

.countries {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
}

.country {
  border-top: 0.5px solid var(--separator);
}

.country-head {
  display: flex;
  width: 100%;
  min-height: 0;
  gap: 10px;
  align-items: center;
  padding: 8px 0;
  border: none;
  border-radius: 0;
  background: transparent;
  color: var(--text);
  text-align: left;
}

.chevron {
  width: 6px;
  height: 6px;
  margin-left: 2px;
  border-right: 2px solid var(--faint);
  border-bottom: 2px solid var(--faint);
  transform: rotate(-45deg);
  transition: transform 0.15s;
}

.chevron.open {
  transform: rotate(45deg);
}

.visits {
  display: grid;
  gap: 2px;
  margin: 0;
  padding: 0 0 8px 34px;
  list-style: none;
  font-size: 0.8rem;
  color: var(--muted);
}

.name {
  flex: 1;
  min-width: 0;
}

.days {
  text-align: right;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.future {
  display: block;
  font-size: 0.8rem;
  font-weight: 400;
  color: var(--warning-text);
}

.unspecified {
  padding-top: 8px;
  border-top: 0.5px solid var(--separator);
}
</style>
