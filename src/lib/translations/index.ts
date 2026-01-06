import { en } from './en';
import { ru } from './ru';
import { tr } from './tr';
import { az } from './az';

export type Language = 'en' | 'ru' | 'tr' | 'az';
export type TranslationKey = keyof typeof en;

const translations = {
  en,
  ru,
  tr,
  az,
};

export const getTranslation = (lang: Language, key: TranslationKey): string => {
  return translations[lang]?.[key] || translations.en[key] || key;
};

export { translations };




