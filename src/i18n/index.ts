import { createInstance } from 'i18next'
import { initReactI18next } from 'react-i18next'
import { getLocales } from 'expo-localization'
import en from './en.json'

// English only for now. Add a language by adding a JSON file and one entry here.
const resources = { en: { translation: en } }

export const i18n = createInstance()

void i18n.use(initReactI18next).init({
  resources,
  lng: getLocales()[0]?.languageCode ?? 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
})
