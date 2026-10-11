import { ref, watch } from 'vue'

// Apparence claire ou sombre (ADR 0010) : choisie dans Réglages ›
// Apparence, « Système » par défaut (réglage du téléphone). Préférence
// propre à l'appareil, gardée dans localStorage. index.html applique la
// même règle avant le premier affichage, pour éviter un flash.
export type AppearancePreference = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'countrep.appearance'

const systemDark = window.matchMedia('(prefers-color-scheme: dark)')

const readPreference = (): AppearancePreference => {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : 'system'
  } catch {
    return 'system'
  }
}

export const appearancePreference = ref<AppearancePreference>(readPreference())

const isDark = () =>
  appearancePreference.value === 'dark' ||
  (appearancePreference.value === 'system' && systemDark.matches)

const apply = () => {
  const dark = isDark()
  document.documentElement.classList.toggle('dark', dark)

  // Barre d'état et barre de navigation du téléphone : couleur du fond
  const background = getComputedStyle(document.documentElement)
    .getPropertyValue('--background')
    .trim()
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', background)
}

export const setAppearancePreference = (preference: AppearancePreference) => {
  appearancePreference.value = preference
  try {
    if (preference === 'system') localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, preference)
  } catch {
    // Préférence non gardée (navigation privée) : elle vaut pour la session
  }
}

watch(appearancePreference, apply)
// En mode système, suivre le passage du téléphone en mode sombre
systemDark.addEventListener('change', apply)
apply()
