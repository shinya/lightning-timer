import React, { useCallback, useEffect, useRef, useState } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import { Store } from "@tauri-apps/plugin-store";
import { Settings as SettingsType } from "./types";
import { useTranslation } from "./i18n/useTranslation";
import { initLanguage } from "./i18n";
import type { LanguageSetting } from "./i18n";

const DEFAULT_SETTINGS: SettingsType = {
  alwaysOnTop: false,
  darkMode: false,
  alarmSound: "alarm.mp3",
  alarmVolume: 0.8,
  displayMode: "normal",
  showTimeUpWindow: true,
  layerTextColor: "#00ff66",
  layerShadowStyle: "dark",
  layerFontSize: 6,
  language: "auto",
};

const LAYER_FONT_SIZE_MIN = 2;
const LAYER_FONT_SIZE_MAX = 14;
const LAYER_FONT_SIZE_STEP = 0.5;

const ALARM_SOUNDS = [
  { value: "alarm.mp3", label: "Alarm" },
  { value: "gong.mp3", label: "Gong" },
  { value: "marimba.mp3", label: "Marimba" },
  { value: "pulse.mp3", label: "Pulse" },
  { value: "symbal.mp3", label: "Symbal" },
];

const COLOR_PRESETS = [
  "#00ff66",
  "#ffffff",
  "#000000",
  "#ffeb3b",
  "#ff5252",
  "#40c4ff",
  "#ff9800",
  "#e040fb",
];

function normalizeSettings(
  saved: (Partial<SettingsType> & { compactMode?: boolean }) | null
): SettingsType {
  if (!saved) return DEFAULT_SETTINGS;
  return {
    alwaysOnTop: saved.alwaysOnTop ?? DEFAULT_SETTINGS.alwaysOnTop,
    darkMode: saved.darkMode ?? DEFAULT_SETTINGS.darkMode,
    alarmSound: saved.alarmSound ?? DEFAULT_SETTINGS.alarmSound,
    alarmVolume: saved.alarmVolume ?? DEFAULT_SETTINGS.alarmVolume,
    displayMode:
      saved.displayMode === "compact" || saved.displayMode === "minimal"
        ? saved.displayMode
        : saved.compactMode
          ? "compact"
          : "normal",
    showTimeUpWindow: saved.showTimeUpWindow ?? DEFAULT_SETTINGS.showTimeUpWindow,
    layerTextColor: saved.layerTextColor ?? DEFAULT_SETTINGS.layerTextColor,
    layerShadowStyle: saved.layerShadowStyle ?? DEFAULT_SETTINGS.layerShadowStyle,
    layerFontSize:
      typeof saved.layerFontSize === "number" && saved.layerFontSize > 0
        ? saved.layerFontSize
        : DEFAULT_SETTINGS.layerFontSize,
    language:
      saved.language === "en" || saved.language === "ja" || saved.language === "auto"
        ? saved.language
        : DEFAULT_SETTINGS.language,
  };
}

const SettingsApp: React.FC = () => {
  const { t, setLanguage: setI18nLanguage } = useTranslation();
  const [settings, setSettings] = useState<SettingsType>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 起動時にストアから読み込み
  useEffect(() => {
    (async () => {
      if (!isTauri()) {
        setLoaded(true);
        return;
      }
      try {
        const store = await Store.load("settings.json");
        const saved = await store.get<
          Partial<SettingsType> & { compactMode?: boolean }
        >("settings");
        setSettings(normalizeSettings(saved ?? null));
      } catch (err) {
        console.error("Failed to load settings:", err);
      }
      setLoaded(true);
    })();
  }, []);

  // ダークモードを設定ウィンドウにも反映
  useEffect(() => {
    document.documentElement.classList.toggle("dark", settings.darkMode);
    document.documentElement.classList.toggle("light", !settings.darkMode);
  }, [settings.darkMode]);

  // メインからの設定プッシュを反映（同期保つ）
  useEffect(() => {
    if (!isTauri()) return;
    const p = listen<SettingsType>("settings-pushed", (event) => {
      setSettings(event.payload);
      // 言語が変わった場合はi18nも同期
      initLanguage(event.payload.language);
      setI18nLanguage(event.payload.language as LanguageSetting);
    });
    return () => {
      p.then((u) => u()).catch(() => {});
    };
  }, [setI18nLanguage]);

  const persist = useCallback(async (next: SettingsType) => {
    setSettings(next);
    if (!isTauri()) return;
    try {
      const store = await Store.load("settings.json");
      await store.set("settings", next);
      await store.save();
      // メインへ通知（emitTo で main に直接配信）
      try {
        const { emitTo } = await import("@tauri-apps/api/event");
        await emitTo("main", "settings-changed", next);
      } catch {
        await emit("settings-changed", next);
      }
    } catch (err) {
      console.error("Failed to save settings:", err);
    }
  }, []);

  const update = useCallback(
    <K extends keyof SettingsType>(key: K, value: SettingsType[K]) => {
      void persist({ ...settings, [key]: value });
    },
    [persist, settings]
  );

  const handleLanguageChange = useCallback(
    (value: string) => {
      const lang = value as LanguageSetting;
      setI18nLanguage(lang);
      initLanguage(lang);
      void persist({ ...settings, language: lang as SettingsType["language"] });
    },
    [persist, settings, setI18nLanguage]
  );

  const handleClose = useCallback(async () => {
    if (!isTauri()) return;
    try {
      await invoke("hide_settings_window");
    } catch (err) {
      console.error("Failed to close settings window:", err);
    }
  }, []);

  const handleTestSound = useCallback(() => {
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
      setIsPlaying(false);
      return;
    }
    const audio = new Audio(`/sounds/${settings.alarmSound}`);
    audio.volume = settings.alarmVolume;
    audioRef.current = audio;
    audio.addEventListener("ended", () => {
      setIsPlaying(false);
      audioRef.current = null;
    });
    audio.addEventListener("error", () => {
      console.error("Failed to play test sound");
      setIsPlaying(false);
      audioRef.current = null;
    });
    audio
      .play()
      .then(() => setIsPlaying(true))
      .catch((err) => {
        console.error("Failed to play test sound:", err);
        setIsPlaying(false);
        audioRef.current = null;
      });
  }, [isPlaying, settings.alarmSound, settings.alarmVolume]);

  // Esc キーで閉じる
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        void handleClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [handleClose]);

  if (!loaded) {
    return <div className="settings-page-loading">Loading…</div>;
  }

  return (
    <div className="settings-page">
      <header className="settings-page-header">
        <h1>{t("settings.title")}</h1>
        <button className="settings-page-close" onClick={handleClose} title={t("settings.close")}>
          ×
        </button>
      </header>

      <main className="settings-page-body">
        <section className="settings-section">
          <h2 className="settings-section-title">{t("settings.language.title")}</h2>
          <div className="settings-row settings-row-inline">
            <span className="settings-row-label">{t("settings.language.label")}</span>
            <div className="settings-row-control">
              <select
                className="settings-select"
                value={settings.language}
                onChange={(e) => handleLanguageChange(e.target.value)}
              >
                <option value="auto">{t("settings.language.auto")}</option>
                <option value="en">{t("settings.language.en")}</option>
                <option value="ja">{t("settings.language.ja")}</option>
              </select>
            </div>
          </div>
          <p className="settings-row-hint">{t("settings.language.hint")}</p>
        </section>

        <section className="settings-section">
          <h2 className="settings-section-title">{t("settings.window.title")}</h2>
          <div className="settings-row">
            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={settings.alwaysOnTop}
                onChange={(e) => update("alwaysOnTop", e.target.checked)}
              />
              <span>{t("settings.window.alwaysOnTop")}</span>
            </label>
            <p className="settings-row-hint">{t("settings.window.alwaysOnTopHint")}</p>
          </div>
          <div className="settings-row">
            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={settings.darkMode}
                onChange={(e) => update("darkMode", e.target.checked)}
              />
              <span>{t("settings.window.darkMode")}</span>
            </label>
            <p className="settings-row-hint">{t("settings.window.darkModeHint")}</p>
          </div>
          <div className="settings-row">
            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={settings.showTimeUpWindow}
                onChange={(e) => update("showTimeUpWindow", e.target.checked)}
              />
              <span>{t("settings.window.showTimeUpWindow")}</span>
            </label>
            <p className="settings-row-hint">{t("settings.window.showTimeUpWindowHint")}</p>
          </div>
        </section>

        <section className="settings-section">
          <h2 className="settings-section-title">{t("settings.alarm.title")}</h2>
          <div className="settings-row settings-row-inline">
            <span className="settings-row-label">{t("settings.alarm.sound")}</span>
            <div className="settings-row-control">
              <select
                className="settings-select"
                value={settings.alarmSound}
                onChange={(e) => update("alarmSound", e.target.value)}
              >
                {ALARM_SOUNDS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <button
                className="settings-icon-button"
                onClick={handleTestSound}
                title={isPlaying ? t("settings.alarm.testStop") : t("settings.alarm.testPlay")}
              >
                {isPlaying ? "⏹" : "▶"}
              </button>
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h2 className="settings-section-title">{t("settings.layer.title")}</h2>
          <div className="settings-row">
            <span className="settings-row-label">{t("settings.layer.textColor")}</span>
            <div className="settings-color-group">
              <input
                type="color"
                className="settings-color-picker"
                value={settings.layerTextColor}
                onChange={(e) => update("layerTextColor", e.target.value)}
              />
              <input
                type="text"
                className="settings-color-hex"
                value={settings.layerTextColor}
                onChange={(e) => update("layerTextColor", e.target.value)}
                spellCheck={false}
              />
              <div className="settings-color-presets">
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`settings-color-swatch${
                      settings.layerTextColor.toLowerCase() === color.toLowerCase()
                        ? " selected"
                        : ""
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => update("layerTextColor", color)}
                    title={color}
                  />
                ))}
              </div>
            </div>
            <p className="settings-row-hint">{t("settings.layer.textColorHint")}</p>
          </div>
          <div className="settings-row">
            <span className="settings-row-label">{t("settings.layer.shadow")}</span>
            <div className="settings-radio-group">
              <label className="settings-radio">
                <input
                  type="radio"
                  name="layerShadowStyle"
                  value="dark"
                  checked={settings.layerShadowStyle === "dark"}
                  onChange={() => update("layerShadowStyle", "dark")}
                />
                <span>{t("settings.layer.darkShadow")}</span>
                <span className="settings-radio-hint">{t("settings.layer.darkShadowHint")}</span>
              </label>
              <label className="settings-radio">
                <input
                  type="radio"
                  name="layerShadowStyle"
                  value="light"
                  checked={settings.layerShadowStyle === "light"}
                  onChange={() => update("layerShadowStyle", "light")}
                />
                <span>{t("settings.layer.lightShadow")}</span>
                <span className="settings-radio-hint">{t("settings.layer.lightShadowHint")}</span>
              </label>
            </div>
          </div>
          <div className="settings-row">
            <span className="settings-row-label">
              {t("settings.layer.fontSize")}
              <span className="settings-row-value">{settings.layerFontSize.toFixed(1)} rem</span>
            </span>
            <div className="settings-slider-group">
              <input
                type="range"
                className="settings-slider"
                min={LAYER_FONT_SIZE_MIN}
                max={LAYER_FONT_SIZE_MAX}
                step={LAYER_FONT_SIZE_STEP}
                value={settings.layerFontSize}
                onChange={(e) => update("layerFontSize", parseFloat(e.target.value))}
              />
              <button
                type="button"
                className="settings-text-button"
                onClick={() => update("layerFontSize", DEFAULT_SETTINGS.layerFontSize)}
                title={t("settings.layer.resetToDefaultTitle")}
              >
                {t("settings.layer.resetToDefault")}
              </button>
            </div>
          </div>
          <div className="settings-row">
            <div
              className="settings-layer-preview"
              data-shadow={settings.layerShadowStyle}
              style={{
                color: settings.layerTextColor,
                fontSize: `${settings.layerFontSize}rem`,
              }}
            >
              12:34
            </div>
            <p className="settings-row-hint">{t("settings.layer.preview")}</p>
          </div>
        </section>
      </main>
    </div>
  );
};

export default SettingsApp;
