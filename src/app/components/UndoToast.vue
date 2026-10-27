<script setup lang="ts">
import { computed } from 'vue'
import { yearOf } from '../../domain/dates'
import { countryName, formatShortStay } from '../format'
import { useData } from '../store'
import { localToday } from '../today'

const { pendingDeletion, deletionError, undoDeletion } = useData()

const text = computed(() => {
  const stay = pendingDeletion.value
  if (!stay) return deletionError.value
  const withYear = yearOf(stay.entry) !== yearOf(localToday())
  return `${countryName(stay.country)}, ${formatShortStay(stay, withYear)} удалена`
})
</script>

<template>
  <div
    class="toast-slot"
    role="status"
    aria-live="polite"
  >
    <div
      v-if="text"
      class="toast"
    >
      <span class="text">{{ text }}</span>
      <button
        v-if="pendingDeletion"
        type="button"
        class="undo"
        @click="undoDeletion"
      >
        Отменить
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Над таб-баром: его высота 56 px плюс безопасная зона. */
.toast-slot {
  position: fixed;
  right: 16px;
  bottom: calc(56px + env(safe-area-inset-bottom) + 12px);
  left: 16px;
  z-index: 11;
  max-width: 728px;
  margin: 0 auto;
  pointer-events: none;
}

.toast {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  min-height: 48px;
  padding: 6px 6px 6px 16px;
  border-radius: 14px;
  background: var(--toast-bg);
  color: var(--toast-text);
  font-size: 15px;
  pointer-events: auto;
  animation: toast-in 0.2s ease;
}

@keyframes toast-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .toast {
    animation: none;
  }
}

.text {
  min-width: 0;
}

.undo {
  flex: none;
  min-height: 36px;
  padding: 0 10px;
  border: none;
  background: transparent;
  color: var(--toast-accent);
  font-weight: 600;
}
</style>
