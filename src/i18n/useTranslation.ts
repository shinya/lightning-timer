import { useState, useEffect, useCallback } from "react";
import { t as translate, getLanguage, setLanguage as setLang } from "./index";
import type { LanguageSetting } from "./index";

export function useTranslation() {
  const [, setRevision] = useState(0);

  useEffect(() => {
    const handler = () => setRevision((r) => r + 1);
    window.addEventListener("language-changed", handler);
    return () => window.removeEventListener("language-changed", handler);
  }, []);

  const setLanguage = useCallback((setting: LanguageSetting) => {
    setLang(setting);
    // Force re-render even if resolveLanguage returns the same value
    // (e.g. switching from "auto" to "en" when OS is English)
    setRevision((r) => r + 1);
  }, []);

  return {
    t: translate,
    language: getLanguage(),
    setLanguage,
  };
}
