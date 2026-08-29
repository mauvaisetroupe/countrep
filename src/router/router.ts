import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import TodayView from '../views/TodayView.vue'
import StatsView from '../views/StatsView.vue'
import ProfileView from '../views/ProfileView.vue'

const routes: Array<RouteRecordRaw> = [
  { path: '/', redirect: '/today' },
  { path: '/today', name: 'today', component: TodayView },
  { path: '/stats', name: 'stats', component: StatsView },
  { path: '/profile', name: 'profile', component: ProfileView },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router