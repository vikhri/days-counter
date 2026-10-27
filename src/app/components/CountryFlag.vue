<script setup lang="ts">
/** С `size` флаг круглый этого диаметра в px, без него — прямоугольный по размеру текста. */
defineProps<{ code: string; size?: number }>()
</script>

<template>
  <span
    v-if="size"
    :class="['fi', 'fis', `fi-${code.toLowerCase()}`, 'flag', 'round']"
    :style="{ width: `${size}px`, height: `${size}px` }"
    aria-hidden="true"
  />
  <span
    v-else
    :class="['fi', `fi-${code.toLowerCase()}`, 'flag']"
    aria-hidden="true"
  />
</template>

<style scoped>
.flag {
  flex: none;
  width: 1.5em;
  line-height: 1.125em;
  border-radius: 2px;
  box-shadow: 0 0 0 0.5px var(--separator);
}

.flag.round {
  border-radius: 50%;
  background-size: cover;
}
</style>
