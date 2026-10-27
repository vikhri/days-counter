<script setup lang="ts">
import { onMounted, onUnmounted, ref, useId } from 'vue'

defineProps<{
  title: string
  /** Слева «Назад» вместо «Отмены» — для второго экрана той же шторки. */
  back?: boolean
}>()

const emit = defineEmits<{ close: []; back: [] }>()

const titleId = useId()

// Открытие, закрытие и смахивание вниз.
const dialog = ref<HTMLDialogElement | null>(null)
const closing = ref(false)
const dragY = ref(0)
let dragStart: number | null = null

/** Смахивание дальше этого закрывает шторку, ближе — возвращает на место. */
const CLOSE_DISTANCE = 120
const CLOSE_DURATION = 200

onMounted(() => {
  dialog.value?.showModal()
  document.documentElement.classList.add('sheet-open')
})

onUnmounted(() => document.documentElement.classList.remove('sheet-open'))

function close() {
  if (closing.value) return
  closing.value = true
  dragY.value = 0
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  setTimeout(() => emit('close'), reduced ? 0 : CLOSE_DURATION)
}

defineExpose({ close })

function onBackdropClick(event: MouseEvent) {
  const sheet = dialog.value?.getBoundingClientRect()
  if (event.target === dialog.value && sheet && event.clientY < sheet.top) close()
}

function onDragStart(event: PointerEvent) {
  if ((event.target as HTMLElement).closest('button')) return
  dragStart = event.clientY
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function onDragMove(event: PointerEvent) {
  if (dragStart !== null) dragY.value = Math.max(0, event.clientY - dragStart)
}

function onDragEnd() {
  if (dragStart === null) return
  dragStart = null
  if (dragY.value > CLOSE_DISTANCE) close()
  else dragY.value = 0
}
</script>

<template>
  <dialog
    ref="dialog"
    class="sheet"
    :class="{ closing, dragging: dragY > 0 }"
    :style="dragY ? { transform: `translateY(${dragY}px)` } : undefined"
    :aria-labelledby="titleId"
    @cancel.prevent="close"
    @click="onBackdropClick"
  >
    <div
      class="handle"
      @pointerdown="onDragStart"
      @pointermove="onDragMove"
      @pointerup="onDragEnd"
      @pointercancel="onDragEnd"
    >
      <span
        class="grabber"
        aria-hidden="true"
      />
      <header class="sheet-head">
        <button
          v-if="back"
          type="button"
          class="text-btn"
          @click="emit('back')"
        >
          Назад
        </button>
        <button
          v-else
          type="button"
          class="text-btn"
          @click="close"
        >
          Отмена
        </button>
        <h2 :id="titleId">
          {{ title }}
        </h2>
        <span aria-hidden="true" />
      </header>
    </div>

    <slot />
  </dialog>
</template>

<style scoped>
/* Высота — по содержимому; шторка с постоянной высотой задаёт её классом. */
.sheet {
  position: fixed;
  inset: auto 0 0;
  width: 100%;
  max-width: 760px;
  max-height: 94dvh;
  margin: 0 auto;
  padding: 0;
  border: none;
  border-radius: 14px 14px 0 0;
  background: var(--sheet);
  color: var(--text);
  transition: transform 0.2s ease;
  animation: sheet-in 0.25s ease;
}

.sheet[open] {
  display: flex;
  flex-direction: column;
}

.sheet.dragging {
  transition: none;
}

.sheet.closing {
  transform: translateY(100%);
}

.sheet::backdrop {
  background: var(--scrim);
}

@keyframes sheet-in {
  from {
    transform: translateY(100%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .sheet {
    transition: none;
    animation: none;
  }
}

.handle {
  flex: none;
  touch-action: none;
}

.grabber {
  display: block;
  width: 36px;
  height: 5px;
  margin: 6px auto 0;
  border-radius: 3px;
  background: var(--faint);
}

.sheet-head {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  height: 44px;
  padding: 0 8px;
}

.sheet-head h2 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
}

.text-btn {
  justify-self: start;
  min-height: 0;
  padding: 8px;
  border: none;
  background: transparent;
  color: var(--accent);
  font-size: 17px;
}
</style>
