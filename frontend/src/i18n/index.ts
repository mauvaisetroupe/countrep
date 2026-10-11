import { ref, watch } from 'vue'
import { createI18n } from 'vue-i18n'
import fr from './fr'
import en from './en'

// Langue de l'interface (ADR 0009) : choisie dans Réglages › Langue,
// « Système » par défaut (langue du téléphone ou du navigateur).
// Préférence propre à l'appareil, gardée dans localStorage.
export type Locale = 'fr' | 'en'
export type LocalePreference = Locale | 'system'

const STORAGE_KEY = 'countrep.locale'

const readPreference = (): LocalePreference => {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'fr' || value === 'en' ? value : 'system'
  } catch {
    return 'system'
  }
}

// Français si la langue principale du système l'est, anglais sinon.
// Seule la première langue compte : Chrome garde dans navigator.languages
// les langues de contenu déjà utilisées, même après un changement de
// langue du téléphone. navigator.language suit la langue de l'interface.
export const systemLocale = (): Locale => {
  const language = navigator.language || navigator.languages?.[0] || ''
  return language.toLowerCase().startsWith('fr') ? 'fr' : 'en'
}

const resolve = (preference: LocalePreference): Locale =>
  preference === 'system' ? systemLocale() : preference

export const localePreference = ref<LocalePreference>(readPreference())

export const i18n = createI18n({
  legacy: false,
  locale: resolve(localePreference.value),
  fallbackLocale: 'en',
  messages: { fr, en }
})

const apply = () => {
  const locale = resolve(localePreference.value)
  i18n.global.locale.value = locale
  document.documentElement.lang = locale
}

export const setLocalePreference = (preference: LocalePreference) => {
  localePreference.value = preference
  try {
    if (preference === 'system') localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, preference)
  } catch {
    // Préférence non gardée (navigation privée) : elle vaut pour la session
  }
}

watch(localePreference, apply)
// En mode système, suivre un changement de langue du téléphone
window.addEventListener('languagechange', apply)
apply()

// Langue courante, hors composant (formatage de dates, noms d'exercices)
export const currentLocale = (): Locale => i18n.global.locale.value as Locale

// Pour Intl / toLocaleDateString
export const dateLocale = (): string => currentLocale() === 'fr' ? 'fr-FR' : 'en-GB'

// Nom d'un exercice dans la langue courante. nameEn peut manquer
// (séance en cours démarrée avant l'i18n) : on garde alors nameFr.
export const exerciseName = (exercise: { nameFr: string, nameEn?: string } | null | undefined): string => {
  if (!exercise) return ''
  return currentLocale() === 'en' && exercise.nameEn ? exercise.nameEn : exercise.nameFr
}

// Nom dans l'autre langue, affiché en second dans les listes du catalogue
export const exerciseAltName = (exercise: { nameFr: string, nameEn?: string } | null | undefined): string => {
  if (!exercise) return ''
  return currentLocale() === 'en' ? exercise.nameFr : exercise.nameEn ?? ''
}
