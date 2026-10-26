<script setup lang="ts">
import { computed, ref } from 'vue'
import { countDays, type PeriodChoice } from '../../domain/counting'
import { RESIDENCY_THRESHOLD, russiaStatus } from '../../domain/russia'
import { SCHENGEN_LIMIT, schengenStatus } from '../../domain/schengen'
import CountryFlag from '../components/CountryFlag.vue'
import PeriodPicker from '../components/PeriodPicker.vue'
import { countryName, formatDateRange, formatDays } from '../format'
import { useData } from '../store'
import { localToday } from '../today'

const { stays, settings } = useData()
const today = localToday()

const period = ref<PeriodChoice>({ kind: 'currentYear' })

const count = computed(() => countDays(stays.value, period.value, today))
const schengen = computed(() => schengenStatus(stays.value, today))
const russia = computed(() => russiaStatus(stays.value, today))

const schengenOver = computed(() => schengen.value.used - SCHENGEN_LIMIT)
const schengenShare = computed(() => `${Math.min(100, (schengen.value.used / SCHENGEN_LIMIT) * 100)}%`)
</script>

<template>
  <section class="dashboard">
    <h1>Дашборд</h1>

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
      <div
        v-if="settings.schengen"
        class="card"
      >
        <h2>Шенген 90/180</h2>
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

      <div class="card">
        <h2>Резидентство РФ</h2>
        <dl class="residency">
          <dt>За {{ russia.currentYear.year }} год</dt>
          <dd>
            {{ russia.currentYear.days }} из {{ RESIDENCY_THRESHOLD }}
            <span
              v-if="russia.currentYear.resident"
              class="status yes"
            >резидент за {{ russia.currentYear.year }}</span>
            <span
              v-else
              class="status"
            >статус определится 31 декабря</span>
          </dd>

          <dt>На сегодня, за 12 месяцев</dt>
          <dd>
            {{ russia.today.days }} из {{ RESIDENCY_THRESHOLD }}
            <span :class="['status', { yes: russia.today.resident }]">
              {{ russia.today.resident ? 'резидент' : 'нерезидент' }}
            </span>
          </dd>

          <dt>За {{ russia.previousYear.year }} год</dt>
          <dd>
            {{ russia.previousYear.days }} из {{ RESIDENCY_THRESHOLD }}
            <span :class="['status', { yes: russia.previousYear.resident }]">
              {{ russia.previousYear.resident ? 'резидент' : 'нерезидент' }}
            </span>
          </dd>
        </dl>
        <p class="footnote muted">
          Выезды на лечение и обучение не учтены.
        </p>
      </div>

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
            <CountryFlag :code="c.country" />
            <span class="name">{{ countryName(c.country) }}</span>
            <span class="days">
              {{ formatDays(c.days) }}
              <span
                v-if="c.futureDays"
                class="future"
              >включая {{ c.futureDays }} будущих</span>
            </span>
          </li>
        </ul>

        <p
          v-if="count.unspecifiedDays"
          class="unspecified muted"
        >
          Не указано: {{ formatDays(count.unspecifiedDays) }}
        </p>
      </div>
    </template>
  </section>
</template>

<style scoped>
.dashboard {
  display: grid;
  gap: 16px;
}

h2 {
  margin: 0 0 8px;
  font-size: 1rem;
}

.card p {
  margin: 0;
}

.big {
  font-size: 2rem;
  font-weight: 600;
  line-height: 1.2;
}

.big .muted {
  font-size: 1rem;
  font-weight: 400;
}

.bar {
  height: 8px;
  margin: 8px 0;
  border-radius: 999px;
  background: var(--border);
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: var(--accent);
}

.bar.over .bar-fill {
  background: var(--danger);
}

.residency {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 6px 16px;
  margin: 0;
}

.residency dt {
  color: var(--muted);
}

.residency dd {
  margin: 0;
  font-variant-numeric: tabular-nums;
}

.status {
  margin-left: 6px;
  color: var(--muted);
}

.status.yes {
  color: var(--text);
  font-weight: 600;
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
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 8px 0;
  border-top: 1px solid var(--border);
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
  color: var(--warning);
}

.unspecified {
  padding-top: 8px;
  border-top: 1px solid var(--border);
}

@media (max-width: 480px) {
  .residency {
    grid-template-columns: 1fr;
    gap: 2px;
  }

  .residency dd {
    margin-bottom: 8px;
  }
}
</style>
