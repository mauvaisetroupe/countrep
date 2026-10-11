import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import TodayView from '../views/TodayView.vue'
import StatsView from '../views/StatsView.vue'
import SettingsView from '../views/SettingsView.vue'
import SettingsAccountView from '../views/SettingsAccountView.vue'
import SettingsExercisesView from '../views/SettingsExercisesView.vue'
import SettingsWorkoutsView from '../views/SettingsWorkoutsView.vue'
import SettingsLanguageView from '../views/SettingsLanguageView.vue'
import SettingsWorkoutEditView from '../views/SettingsWorkoutEditView.vue'
import LoginView from '../views/LoginView.vue'
import JournalView from '../views/JournalView.vue'
import PreviewView from '../views/PreviewView.vue'

const routes: Array<RouteRecordRaw> = [
  { path: '/login', name: 'login', component: LoginView },
  { path: '/', redirect: '/today' },
  { path: '/today', name: 'today', component: TodayView, meta: { requiresAuth: true } },
  { path: '/journal', name: 'journal', component: JournalView, meta: { requiresAuth: true } },
  { path: '/preview', name: 'preview', component: PreviewView, meta: { requiresAuth: true } },
  { path: '/stats', name: 'stats', component: StatsView, meta: { requiresAuth: true } },
  { path: '/settings', name: 'settings', component: SettingsView, meta: { requiresAuth: true } },
  { path: '/settings/account', name: 'settings-account', component: SettingsAccountView, meta: { requiresAuth: true } },
  { path: '/settings/exercises', name: 'settings-exercises', component: SettingsExercisesView, meta: { requiresAuth: true } },
  { path: '/settings/language', name: 'settings-language', component: SettingsLanguageView, meta: { requiresAuth: true } },
  { path: '/settings/workouts', name: 'settings-workouts', component: SettingsWorkoutsView, meta: { requiresAuth: true } },
  { path: '/settings/workouts/new', name: 'settings-workout-new', component: SettingsWorkoutEditView, meta: { requiresAuth: true } },
  { path: '/settings/workouts/:id', name: 'settings-workout-edit', component: SettingsWorkoutEditView, props: true, meta: { requiresAuth: true } },
  // Ancienne page Profil (favoris, PWA installées)
  { path: '/profile', redirect: '/settings' },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  // Chaque page s'ouvre en haut ; « retour » retrouve la position précédente
  scrollBehavior(_to, _from, savedPosition) {
    return savedPosition ?? { top: 0 }
  },
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