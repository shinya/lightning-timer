import en from "./en";
import ja from "./ja";
import type { Translations } from "./en";

export type Language = "en" | "ja";
export type LanguageSetting = Language | "auto";

const translations: Record<Language, Translations> = { en, ja };

let currentLanguage: Language = "en";

function detectOSLanguage(): Language {
  const nav = navigator.language;
  if (nav.startsWith("ja")) return "ja";
  return "en";
}

function resolveLanguage(setting: LanguageSetting): Language {
  if (setting === "auto") return detectOSLanguage();
  return setting;
}

export function initLanguage(saved?: string): void {
  const setting: LanguageSetting =
    saved === "en" || saved === "ja" || saved === "auto" ? saved : "auto";
  currentLanguage = resolveLanguage(setting);
  localStorage.setItem("lightning-timer-language", currentLanguage);
}

export function getLanguage(): Language {
  return currentLanguage;
}

export function setLanguage(setting: LanguageSetting): void {
  const resolved = resolveLanguage(setting);
  if (resolved === currentLanguage) return;
  currentLanguage = resolved;
  localStorage.setItem("lightning-timer-language", resolved);
  window.dispatchEvent(
    new CustomEvent("language-changed", { detail: resolved })
  );
}

// Dot-notation key lookup: t("settings.alarm.sound") → translations[lang].settings.alarm.sound
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getNestedValue(obj: any, path: string): string {
  const keys = path.split(".");
  let result = obj;
  for (const key of keys) {
    if (result == null || typeof result !== "object") return path;
    result = result[key];
  }
  return typeof result === "string" ? result : path;
}

export function t(key: string): string {
  return getNestedValue(translations[currentLanguage], key);
}
