<script setup lang="ts">
import { watch } from 'vue'
import { accessKey } from './accessKey'
import KeyGate from './components/KeyGate.vue'
import { useData } from './store'

const { loaded, loadError, reload } = useData()

watch(
  accessKey,
  (key) => {
    if (key) reload()
  },
  { immediate: true },
)
</script>

<template>
  <KeyGate v-if="!accessKey" />
  <template v-else>
    <nav class="nav">
      <RouterLink to="/">
        Дашборд
      </RouterLink>
      <RouterLink to="/stays">
        Пребывания
      </RouterLink>
    </nav>
    <main>
      <p
        v-if="loadError"
        class="error"
        role="alert"
      >
        Не удалось загрузить данные: {{ loadError }}
        <button
          type="button"
          class="secondary"
          @click="reload"
        >
          Повторить
        </button>
      </p>
      <p
        v-else-if="!loaded"
        class="muted"
      >
        Загрузка…
      </p>
      <RouterView v-else />
    </main>
  </template>
</template>

<style scoped>
.nav {
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--border);
}

.nav a {
  padding: 10px 12px;
  color: var(--muted);
  text-decoration: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}

.nav a.router-link-exact-active {
  color: var(--text);
  border-bottom-color: var(--accent);
}
</style>
