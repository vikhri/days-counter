<script setup lang="ts">
defineProps<{ title: string }>()
</script>

<template>
  <header class="screen-header">
    <h1>{{ title }}</h1>
    <div class="actions">
      <slot />
    </div>
  </header>
</template>

<style scoped>
/* Заголовок и кнопки в одной строке; кнопка ниже заголовка, поэтому без неё строка не меняет высоту. */
.screen-header {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}

.actions {
  display: flex;
  flex: none;
  gap: 8px;
}

h1 {
  min-width: 0;
  margin: 0;
  font-size: 34px;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 41px;
}

/* Круглая кнопка 36 px в шапке, приглушённая. Акцентная — с классом accent или нажатая. */
.actions :slotted(button) {
  display: flex;
  width: 36px;
  height: 36px;
  min-height: 0;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: var(--fill);
  color: var(--muted);
}

.actions :slotted(button[aria-pressed='true']),
.actions :slotted(button.accent) {
  background: var(--accent);
  color: var(--accent-text);
}

.actions :slotted(svg) {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: transform 0.15s;
}

.actions :slotted(button[aria-expanded='true'] svg) {
  transform: rotate(45deg);
}

@media (prefers-reduced-motion: reduce) {
  .actions :slotted(svg) {
    transition: none;
  }
}
</style>
