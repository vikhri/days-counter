<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'

/** Строка, которая свайпом влево открывает «Изменить» и «Удалить». Открытой может быть одна — это решает родитель. */
const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ 'update:open': [open: boolean]; edit: []; delete: [] }>()

const ACTION_WIDTH = 75
const ACTIONS_WIDTH = ACTION_WIDTH * 2
/** Сдвиг, после которого жест считается горизонтальным или вертикальным. */
const SLOP = 8

const root = ref<HTMLElement | null>(null)
const offset = ref(0)
const dragging = ref(false)
let start: { x: number; y: number; base: number } | null = null
let horizontal: boolean | null = null
let suppressClick = false

watch(
  () => props.open,
  (open) => {
    if (!dragging.value) offset.value = open ? -ACTIONS_WIDTH : 0
  },
)

function onPointerDown(event: PointerEvent) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  start = { x: event.clientX, y: event.clientY, base: offset.value }
  horizontal = null
  suppressClick = false
}

function onPointerMove(event: PointerEvent) {
  if (!start) return
  const dx = event.clientX - start.x
  const dy = event.clientY - start.y
  if (horizontal === null) {
    if (Math.abs(dx) < SLOP && Math.abs(dy) < SLOP) return
    horizontal = Math.abs(dx) > Math.abs(dy)
    // Вертикальный жест — это прокрутка, её делает браузер.
    if (!horizontal) {
      start = null
      return
    }
    dragging.value = true
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }
  offset.value = Math.min(0, Math.max(-ACTIONS_WIDTH - 24, start.base + dx))
}

function onPointerEnd() {
  start = null
  if (!dragging.value) return
  dragging.value = false
  suppressClick = true
  const open = offset.value < -ACTION_WIDTH
  offset.value = open ? -ACTIONS_WIDTH : 0
  emit('update:open', open)
}

/** Клик после перетаскивания и тап по открытой строке только закрывают её. */
function onClickCapture(event: MouseEvent) {
  if (!suppressClick && !props.open) return
  event.preventDefault()
  event.stopPropagation()
  // Клик, которым закончилось перетаскивание, только гасится: строка уже открыта или закрыта как надо.
  if (suppressClick) suppressClick = false
  else emit('update:open', false)
}

// Тап или прокрутка мимо открытой строки закрывают её; тап при этом больше ничего не делает.
function onOutsidePointerDown(event: PointerEvent) {
  if (root.value?.contains(event.target as Node)) return
  emit('update:open', false)
  const swallow = (click: MouseEvent) => {
    click.preventDefault()
    click.stopPropagation()
  }
  document.addEventListener('click', swallow, { capture: true, once: true })
  setTimeout(() => document.removeEventListener('click', swallow, { capture: true }), 600)
}

watch(
  () => props.open,
  (open) => {
    if (open) document.addEventListener('pointerdown', onOutsidePointerDown, { capture: true })
    else document.removeEventListener('pointerdown', onOutsidePointerDown, { capture: true })
  },
)

onUnmounted(() => document.removeEventListener('pointerdown', onOutsidePointerDown, { capture: true }))

function act(action: 'edit' | 'delete') {
  emit('update:open', false)
  if (action === 'edit') emit('edit')
  else emit('delete')
}
</script>

<template>
  <div
    ref="root"
    class="swipe"
  >
    <!-- Те же действия доступны из шторки правки, поэтому закрытые кнопки скрыты от клавиатуры и дикторов. -->
    <div
      class="actions"
      :aria-hidden="!open"
    >
      <button
        type="button"
        class="action edit"
        :tabindex="open ? 0 : -1"
        @click="act('edit')"
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
        </svg>
        Изменить
      </button>
      <button
        type="button"
        class="action delete"
        :tabindex="open ? 0 : -1"
        @click="act('delete')"
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
        </svg>
        Удалить
      </button>
    </div>
    <div
      class="content"
      :class="{ dragging }"
      :style="offset ? { transform: `translateX(${offset}px)` } : undefined"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerEnd"
      @pointercancel="onPointerEnd"
      @click.capture="onClickCapture"
    >
      <slot />
    </div>
  </div>
</template>

<style scoped>
.swipe {
  position: relative;
  overflow: hidden;
}

.actions {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
}

.action {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  justify-content: center;
  width: 75px;
  min-height: 0;
  padding: 0;
  border: none;
  border-radius: 0;
  color: var(--accent-text);
  font-size: 12px;
  font-weight: 500;
}

.action svg {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.edit {
  background: var(--swipe-edit);
}

.delete {
  background: var(--danger);
}

/* flow-root: отступы содержимого не выпадают наружу, иначе под строкой видны кнопки. */
.content {
  display: flow-root;
  position: relative;
  background: var(--surface);
  touch-action: pan-y;
  user-select: none;
  -webkit-user-select: none;
  transition: transform 0.2s ease;
}

.content.dragging {
  transition: none;
}

@media (prefers-reduced-motion: reduce) {
  .content {
    transition: none;
  }
}
</style>
