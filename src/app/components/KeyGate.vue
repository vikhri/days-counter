<script setup lang="ts">
import { ref } from 'vue'
import { keyRejected, saveAccessKey } from '../accessKey'

const key = ref('')

function submit() {
  if (key.value.trim()) saveAccessKey(key.value.trim())
}
</script>

<template>
  <form
    class="key-gate"
    @submit.prevent="submit"
  >
    <h1>Дни по странам</h1>
    <p>Введите ключ доступа. Он запомнится на этом устройстве.</p>
    <p
      v-if="keyRejected"
      class="error"
      role="alert"
    >
      Ключ не подошёл.
    </p>
    <input
      v-model="key"
      type="password"
      autocomplete="current-password"
      placeholder="Ключ доступа"
      required
    >
    <button type="submit">
      Войти
    </button>
  </form>
</template>

<style scoped>
.key-gate {
  display: grid;
  gap: 12px;
  max-width: 360px;
  margin: 15vh auto 0;
}
</style>
