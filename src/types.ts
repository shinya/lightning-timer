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
  displayMode: "normal" | "compact" | "minimal";
  showTimeUpWindow: boolean;
  layerTextColor: string;
  layerShadowStyle: "dark" | "light";
  layerFontSize: number;
}

export interface TimerDisplayProps {
  minutes: number;
  seconds: number;
  isRunning: boolean;
  showTimeUp?: boolean;
}

export interface TimerControlsProps {
  minutes: number;
  seconds: number;
  isRunning: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onSettings: () => void;
  onHelp: () => void;
  onMinutesChange: (minutes: number) => void;
  onSecondsChange: (seconds: number) => void;
  onBothChange: (minutes: number, seconds: number) => void;
  alarmVolume: number;
  onAlarmVolumeChange: (volume: number) => void;
}

