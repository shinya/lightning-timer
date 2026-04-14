const en = {
  settings: {
    title: "Settings",
    close: "Close (Esc)",
    window: {
      title: "Window",
      alwaysOnTop: "Always on top",
      alwaysOnTopHint: "Keep timer window always on top",
      darkMode: "Dark mode",
      darkModeHint: "Toggle UI theme",
      showTimeUpWindow: 'Show "Time Up" window',
      showTimeUpWindowHint: 'Show full-screen "Time Up" screen when timer ends',
    },
    alarm: {
      title: "Alarm",
      sound: "Sound",
      testPlay: "Play",
      testStop: "Stop",
    },
    layer: {
      title: "Layer overlay",
      textColor: "Text color",
      textColorHint:
        "Choose the digit color for the layer overlay. Adjust to match your background.",
      shadow: "Shadow",
      darkShadow: "Dark shadow",
      darkShadowHint: "For light backgrounds",
      lightShadow: "Light shadow",
      lightShadowHint: "For dark backgrounds",
      fontSize: "Font size",
      resetToDefault: "Reset",
      resetToDefaultTitle: "Reset to default",
      preview: "Preview",
    },
    language: {
      title: "Language",
      label: "Display language",
      hint: "Change the UI language (timer display always remains in English)",
      auto: "Auto (OS language)",
      en: "English",
      ja: "Japanese",
    },
  },
  help: {
    title: "Keyboard Shortcuts",
    keyColumn: "Key",
    actionColumn: "Action",
    shortcuts: {
      numbers: "Set timer time (left shift method)",
      startPause: "Start/Pause timer",
      reset: "Reset timer",
      toggleCompactMode: "Toggle display mode",
      toggleFullscreen: "Toggle fullscreen",
      toggleLayer: "Toggle layer overlay",
    },
  },
  about: {
    title: "About",
    version: "Version",
  },
  tooltips: {
    exitApp: "Exit application",
    compactMode: "Compact display mode",
    minimalMode: "Minimal display mode",
    normalMode: "Return to normal display",
    layerOn: "Show layer overlay (L)",
    layerOff: "Hide layer overlay (L)",
    fullscreen: "Fullscreen",
    windowMode: "Return to windowed mode",
    appInfo: "App Info",
    setTimeFirst: "Set time first",
    startTimer: "Start timer",
  },
  timeup: {
    subtitle: "The time has come.",
    instruction: "Click or press the Esc key to close",
  },
} as const;

// Recursively widen all string literal types to string
type Widen<T> = T extends string
  ? string
  : { [K in keyof T]: Widen<T[K]> };

export type Translations = Widen<typeof en>;
export default en;
