import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import TodayView from '../views/TodayView.vue'
import StatsView from '../views/StatsView.vue'
import ProfileView from '../views/ProfileView.vue'
import LoginView from '../views/LoginView.vue'
import JournalView from '../views/JournalView.vue'

const routes: Array<RouteRecordRaw> = [
  { path: '/login', name: 'login', component: LoginView },
  { path: '/', redirect: '/today' },
  { path: '/today', name: 'today', component: TodayView, meta: { requiresAuth: true } },
  { path: '/journal', name: 'journal', component: JournalView, meta: { requiresAuth: true } },
  { path: '/stats', name: 'stats', component: StatsView, meta: { requiresAuth: true } },
  { path: '/profile', name: 'profile', component: ProfileView, meta: { requiresAuth: true } },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'login' })
  } else if (to.name === 'login' && authStore.isAuthenticated) {
    next({ name: 'today' })
  } else {
    next()
  }
})

export default router