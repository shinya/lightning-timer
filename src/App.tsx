import React, { useState, useEffect, useCallback } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Store } from "@tauri-apps/plugin-store";
import TimerDisplay from "./components/TimerDisplay";
import TimerControls from "./components/TimerControls";
import Settings from "./components/Settings";
import { TimerState, Settings as SettingsType } from "./types";

const App: React.FC = () => {
  // デバッグ: Tauri APIの状態を確認
  useEffect(() => {
    console.log("DEBUG: Tauri API check");
    console.log(
      "DEBUG: window.__TAURI__:",
      (window as unknown as { __TAURI__?: unknown }).__TAURI__
    );
    console.log("DEBUG: invoke function:", invoke);
  }, []);

  // ウィンドウ状態の復元と保存（プラグインが自動処理するため無効化）
  useEffect(() => {
    if (!isTauri()) return;

    console.log(
      "DEBUG: Window state plugin should handle restoration automatically"
    );

    // プラグインが自動的に復元・保存を処理するため、手動処理は無効化
    // デバッグ用にログのみ出力
    console.log("DEBUG: Relying on plugin automatic restoration");
  }, []);

  const [timerState, setTimerState] = useState<TimerState>({
    minutes: 0,
    seconds: 0,
    isRunning: false,
    isPaused: false,
    timeRemaining: 0,
  });

  const [settings, setSettings] = useState<SettingsType>({
    alwaysOnTop: false,
    darkMode: false,
    alarmSound: "alarm.mp3",
    alarmVolume: 0.8,
  });

  // 設定の保存・読み込み
  const loadSettings = useCallback(async () => {
    if (!isTauri()) return;

    try {
      const settings = await Store.load("settings.json");
      const savedSettings = await settings.get<SettingsType>("settings");
      if (savedSettings) {
        setSettings(savedSettings);
        console.log("DEBUG: Settings loaded:", savedSettings);
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  }, []);

  const saveSettings = useCallback(async (newSettings: SettingsType) => {
    if (!isTauri()) return;

    try {
      const settings = await Store.load("settings.json");
      await settings.set("settings", newSettings);
      await settings.save();
      console.log("DEBUG: Settings saved:", newSettings);
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  }, []);

  const [showSettings, setShowSettings] = useState(false);

  // 最後に設定した時間を記憶する状態
  const [lastSetTime, setLastSetTime] = useState<{
    minutes: number;
    seconds: number;
  } | null>(null);
  const [hasNumberBeenEdited, setHasNumberBeenEdited] = useState(false);

  const loadTimerState = useCallback(async () => {
    if (!isTauri()) return;

    try {
      const settings = await Store.load("settings.json");
      const savedTimerData = await settings.get<{
        minutes: number;
        seconds: number;
        lastSetTime: { minutes: number; seconds: number } | null;
      }>("timer");

      if (savedTimerData) {
        setTimerState((prev) => ({
          ...prev,
          minutes: savedTimerData.minutes,
          seconds: savedTimerData.seconds,
          timeRemaining: savedTimerData.minutes * 60 + savedTimerData.seconds,
        }));
        setLastSetTime(savedTimerData.lastSetTime);
        console.log("DEBUG: Timer state loaded:", savedTimerData);
      }
    } catch (error) {
      console.error("Failed to load timer state:", error);
    }
  }, []);

  const playAlarm = useCallback(() => {
    // 選択されたアラーム音ファイルを再生
    const audio = new Audio(`/sounds/${settings.alarmSound}`);
    audio.volume = settings.alarmVolume;
    audio.play().catch((error) => {
      console.error("Failed to play alarm sound:", error);
    });
  }, [settings.alarmSound, settings.alarmVolume]);

  // タイマー状態の保存・読み込み
  useEffect(() => {
    let interval: number | null = null;

    if (timerState.isRunning && timerState.timeRemaining > 0) {
      interval = setInterval(() => {
        setTimerState((prev) => {
          const newTimeRemaining = prev.timeRemaining - 1;
          if (newTimeRemaining <= 0) {
            // タイマー終了
            playAlarm();
            // 最後に設定した時間があれば復元
            if (lastSetTime) {
              const restoredTotalSeconds =
                lastSetTime.minutes * 60 + lastSetTime.seconds;
              return {
                ...prev,
                isRunning: false,
                timeRemaining: restoredTotalSeconds,
                minutes: lastSetTime.minutes,
                seconds: lastSetTime.seconds,
              };
            } else {
              return {
                ...prev,
                isRunning: false,
                timeRemaining: 0,
                minutes: 0,
                seconds: 0,
              };
            }
          }
          return {
            ...prev,
            timeRemaining: newTimeRemaining,
            minutes: Math.floor(newTimeRemaining / 60),
            seconds: newTimeRemaining % 60,
          };
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerState.isRunning, timerState.timeRemaining, lastSetTime, playAlarm]);

  const updateTimer = useCallback((minutes: number, seconds: number) => {
    const totalSeconds = minutes * 60 + seconds;
    console.log(
      "DEBUG: updateTimer called with:",
      minutes,
      ":",
      seconds,
      "total:",
      totalSeconds
    );
    setTimerState((prev) => {
      const newState = {
        ...prev,
        minutes,
        seconds,
        timeRemaining: totalSeconds,
      };
      console.log("DEBUG: updateTimer new state:", newState);
      return newState;
    });
  }, []);

  const updateTimerBoth = useCallback(
    async (minutes: number, seconds: number) => {
      const totalSeconds = minutes * 60 + seconds;
      console.log(
        "DEBUG: updateTimerBoth called with:",
        minutes,
        ":",
        seconds,
        "total:",
        totalSeconds
      );

      // 数字が編集されたことを記録
      setHasNumberBeenEdited(true);

      setTimerState((prev) => {
        const newState = {
          ...prev,
          minutes,
          seconds,
          timeRemaining: totalSeconds,
        };
        console.log("DEBUG: updateTimerBoth new state:", newState);
        return newState;
      });

      // タイマー状態を即座に保存（新しい値を使用）
      if (isTauri()) {
        try {
          const settings = await Store.load("settings.json");
          const timerData = {
            minutes,
            seconds,
            lastSetTime: lastSetTime,
          };
          await settings.set("timer", timerData);
          await settings.save();
          console.log("DEBUG: Timer state saved immediately:", timerData);
        } catch (error) {
          console.error("Failed to save timer state immediately:", error);
        }
      }
    },
    [lastSetTime]
  );

  const startTimer = () => {
    // 数字が編集されていた場合のみ、現在の時間を記憶
    if (hasNumberBeenEdited) {
      setLastSetTime({
        minutes: timerState.minutes,
        seconds: timerState.seconds,
      });
      setHasNumberBeenEdited(false); // フラグをリセット
      console.log(
        "DEBUG: Last set time saved:",
        timerState.minutes,
        ":",
        timerState.seconds
      );
    }

    setTimerState((prev) => ({
      ...prev,
      isRunning: true,
      isPaused: false,
    }));
  };

  const pauseTimer = () => {
    setTimerState((prev) => ({
      ...prev,
      isRunning: false,
      isPaused: true,
    }));
  };

  const resetTimer = () => {
    // リセット時に記憶もクリア
    setLastSetTime(null);
    setHasNumberBeenEdited(false);

    setTimerState((prev) => ({
      ...prev,
      isRunning: false,
      isPaused: false,
      minutes: 0,
      seconds: 0,
      timeRemaining: 0,
    }));
  };

  // F12キーでデベロッパーツールを開く
  useEffect(() => {
    const handleKeyDown = async (event: KeyboardEvent) => {
      if (event.key === "F12") {
        event.preventDefault();
        if (!isTauri()) {
          console.log(
            "DEBUG: Not running in Tauri environment, cannot open devtools"
          );
          return;
        }
        try {
          await invoke("open_devtools");
        } catch (error) {
          console.error("Failed to open devtools:", error);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // アプリ起動時に設定とタイマー状態を読み込み
  useEffect(() => {
    loadSettings();
    loadTimerState();
  }, [loadSettings, loadTimerState]);

  // アプリ終了時にタイマー状態を保存
  useEffect(() => {
    const handleBeforeUnload = async () => {
      // 同期的に保存処理を実行
      if (isTauri()) {
        try {
          const settings = await Store.load("settings.json");
          const timerData = {
            minutes: timerState.minutes,
            seconds: timerState.seconds,
            lastSetTime: lastSetTime,
          };
          await settings.set("timer", timerData);
          await settings.save();
          console.log("DEBUG: Timer state saved on exit:", timerData);
        } catch (error) {
          console.error("Failed to save timer state on exit:", error);
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [timerState.minutes, timerState.seconds, lastSetTime]);

  // 設定変更を処理する関数
  const handleSettingsChange = useCallback(
    async (newSettings: SettingsType) => {
      // Always on topの設定を適用
      if (isTauri() && newSettings.alwaysOnTop !== settings.alwaysOnTop) {
        try {
          const currentWindow = getCurrentWindow();
          await currentWindow.setAlwaysOnTop(newSettings.alwaysOnTop);
          console.log("DEBUG: Always on top set to:", newSettings.alwaysOnTop);
        } catch (error) {
          console.error("Failed to set always on top:", error);
        }
      }

      setSettings(newSettings);
      // 設定を保存
      await saveSettings(newSettings);
    },
    [settings.alwaysOnTop, saveSettings]
  );

  return (
    <div className={`app ${settings.darkMode ? "dark" : "light"}`}>
      <div className="timer-container">
        <TimerDisplay
          minutes={timerState.minutes}
          seconds={timerState.seconds}
          isRunning={timerState.isRunning}
        />

        <TimerControls
          minutes={timerState.minutes}
          seconds={timerState.seconds}
          isRunning={timerState.isRunning}
          onStart={startTimer}
          onPause={pauseTimer}
          onReset={resetTimer}
          onSettings={() => setShowSettings(true)}
          onMinutesChange={(minutes) =>
            updateTimer(minutes, timerState.seconds)
          }
          onSecondsChange={(seconds) =>
            updateTimer(timerState.minutes, seconds)
          }
          onBothChange={updateTimerBoth}
          alarmVolume={settings.alarmVolume}
          onAlarmVolumeChange={(volume) => {
            const newSettings = { ...settings, alarmVolume: volume };
            setSettings(newSettings);
            saveSettings(newSettings);
          }}
        />
      </div>

      {showSettings && (
        <Settings
          settings={settings}
          onClose={() => setShowSettings(false)}
          onSettingsChange={handleSettingsChange}
        />
      )}
    </div>
  );
};

export default App;
