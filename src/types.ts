export interface TimerState {
  minutes: number;
  seconds: number;
  isRunning: boolean;
  isPaused: boolean;
  timeRemaining: number;
}

export interface Settings {
  alwaysOnTop: boolean;
  darkMode: boolean;
}

export interface TimerDisplayProps {
  minutes: number;
  seconds: number;
  isRunning: boolean;
}

export interface TimerControlsProps {
  minutes: number;
  seconds: number;
  isRunning: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onSettings: () => void;
  onMinutesChange: (minutes: number) => void;
  onSecondsChange: (seconds: number) => void;
  onNumberInput: (number: number) => void;
}


export interface SettingsProps {
  settings: Settings;
  onClose: () => void;
  onSettingsChange: (settings: Settings) => void;
}
