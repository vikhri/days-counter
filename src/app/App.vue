<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
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

// Тулбар прячется при прокрутке вниз и возвращается при прокрутке вверх.
// Мелкие сдвиги копятся до порога, а «резинка» iOS за краями страницы
// не считается прокруткой — иначе тулбар дёргается.
const SCROLL_THRESHOLD = 8
const toolbarHidden = ref(false)
let lastScrollY = 0

function onScroll() {
  const y = window.scrollY
  if (y <= 0) {
    toolbarHidden.value = false
    lastScrollY = 0
    return
  }
  if (y > document.documentElement.scrollHeight - window.innerHeight) return
  if (Math.abs(y - lastScrollY) < SCROLL_THRESHOLD) return
  toolbarHidden.value = y > lastScrollY
  lastScrollY = y
}

onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onUnmounted(() => window.removeEventListener('scroll', onScroll))

const route = useRoute()
watch(
  () => route.path,
  () => {
    toolbarHidden.value = false
  },
)
</script>

<template>
  <KeyGate v-if="!accessKey" />
  <template v-else>
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
    <nav
      class="toolbar"
      :class="{ hidden: toolbarHidden }"
    >
      <RouterLink
        to="/"
        class="tab"
        aria-label="Дашборд"
        title="Дашборд"
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
        </svg>
      </RouterLink>
      <RouterLink
        to="/stays"
        class="tab"
        aria-label="Пребывания"
        title="Пребывания"
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M9 6h11M9 12h11M9 18h11" />
          <circle
            cx="4"
            cy="6"
            r="1.5"
          />
          <circle
            cx="4"
            cy="12"
            r="1.5"
          />
          <circle
            cx="4"
            cy="18"
            r="1.5"
          />
        </svg>
      </RouterLink>
    </nav>
  </template>
</template>

<style scoped>
main {
  padding-bottom: calc(72px + env(safe-area-inset-bottom));
}

.toolbar {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 10;
  display: flex;
  justify-content: space-around;
  max-width: 760px;
  margin: 0 auto;
  padding-bottom: env(safe-area-inset-bottom);
  border-top: 0.5px solid var(--separator);
  background: var(--bar);
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  transition: transform 0.2s ease;
}

/* С клавиатуры тулбар доступен всегда. */
.toolbar.hidden:not(:focus-within) {
  transform: translateY(100%);
}

@media (prefers-reduced-motion: reduce) {
  .toolbar {
    transition: none;
  }
}

.tab {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  height: 56px;
  color: var(--faint);
  text-decoration: none;
}

.tab.router-link-exact-active {
  color: var(--accent);
}

.tab svg {
  width: 28px;
  height: 28px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
</style>
