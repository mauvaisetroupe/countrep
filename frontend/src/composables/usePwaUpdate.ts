import { ref } from 'vue'
import { registerSW } from 'virtual:pwa-register'

export const needRefresh = ref(false)
export const offlineReady = ref(false)

export const updateSW = registerSW({
  immediate: true,

  onNeedRefresh() {
    console.log('🔄 Nouvelle version de CountRep disponible')
    needRefresh.value = true
  },

  onOfflineReady() {
    console.log('📱 CountRep est disponible hors ligne')
    offlineReady.value = true
  },

  onRegisterError(error: unknown) {
    console.error('❌ Erreur Service Worker:', error)
  }
})