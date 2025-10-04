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
  alarmSound: string;
  alarmVolume: number;
  compactMode: boolean;
  showTimeUpWindow: boolean;
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
  onBothChange: (minutes: number, seconds: number) => void;
  alarmVolume: number;
  onAlarmVolumeChange: (volume: number) => void;
}

export interface SettingsProps {
  settings: Settings;
  onClose: () => void;
  onSettingsChange: (settings: Settings) => void;
}
