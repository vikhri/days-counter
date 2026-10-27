<script setup lang="ts">
defineProps<{ title: string }>()
</script>

<template>
  <header class="screen-header">
    <!-- Строка под кнопку держит высоту и без кнопки, чтобы заголовок не прыгал. -->
    <div class="actions">
      <slot />
    </div>
    <h1>{{ title }}</h1>
  </header>
</template>

<style scoped>
.actions {
  display: flex;
  justify-content: flex-end;
  min-height: 36px;
}

h1 {
  margin: 4px 0 0;
  font-size: 34px;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 41px;
}

/* Круглая кнопка 36 px в шапке. Акцентная — с классом accent. */
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
  background: var(--surface);
  color: var(--text);
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
