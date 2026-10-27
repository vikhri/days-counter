import '@fontsource-variable/onest'
import '@fontsource-variable/unbounded'
import 'flag-icons/css/flag-icons.min.css'
import './style.css'
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import DashboardView from './views/DashboardView.vue'
import StaysView from './views/StaysView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: DashboardView },
    { path: '/stays', component: StaysView },
  ],
})

createApp(App).use(router).mount('#app')
