<script setup lang="ts">
defineProps<{ code: string }>()
</script>

<template>
  <span
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
</style>
