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
    compactMode: false, // 常に通常モードで起動
  });

  // ポート動的設定
  const setupPort = useCallback(async () => {
    if (!isTauri()) return 1420; // 開発時は固定ポート

    try {
      // 製品ビルド時のみ動的ポート取得
      // 開発時は1420番ポートを使用
      const port = await invoke("get_available_port");
      console.log("DEBUG: Using dynamic port:", port);
      return port;
    } catch (error) {
      console.error("Failed to get available port:", error);
      return 1420; // フォールバック
    }
  }, []);

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

            // Time Upウィンドウを表示
            if (isTauri()) {
              invoke("show_timeup_window").catch((error) => {
                console.error("Failed to show Time Up window:", error);
              });
            }

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

  const startTimer = useCallback(() => {
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
  }, [hasNumberBeenEdited, timerState.minutes, timerState.seconds]);

  const pauseTimer = useCallback(() => {
    setTimerState((prev) => ({
      ...prev,
      isRunning: false,
      isPaused: true,
    }));
  }, []);

  const resetTimer = useCallback(() => {
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
  }, []);

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
    const initializeApp = async () => {
      // ポート設定
      const port = await setupPort();
      console.log("DEBUG: App initialized with port:", port);

      // 設定読み込み
      await loadSettings();
      await loadTimerState();
    };

    initializeApp();
  }, [setupPort, loadSettings, loadTimerState]);

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

  const handlePowerButtonClick = async () => {
    if (isTauri()) {
      try {
        await invoke("exit_app");
      } catch (error) {
        console.error("Failed to exit app:", error);
      }
    }
  };

  const handleDragStart = async (event: React.MouseEvent) => {
    // 操作可能な要素（ボタン、スライダー、入力要素など）でのドラッグ開始を防ぐ
    const target = event.target as HTMLElement;
    const isInteractiveElement = target.closest('button, input, select, .volume-slider, .volume-control-container, .settings-overlay');

    if (isInteractiveElement) {
      return; // 操作可能な要素ではドラッグを開始しない
    }

    if (isTauri()) {
      try {
        await invoke("start_drag");
      } catch (error) {
        console.error("Failed to start drag:", error);
      }
    }
  };

  const handleMouseUp = async () => {
    // ドラッグ終了時にウィンドウ位置を保存
    if (isTauri()) {
      try {
        await invoke("save_window_position");
      } catch (error) {
        console.error("Failed to save window position:", error);
      }
    }
  };

  const handleCompactModeToggle = useCallback(async () => {
    const newCompactMode = !settings.compactMode;
    const newSettings = { ...settings, compactMode: newCompactMode };
    setSettings(newSettings);
    // 簡易表示モードの状態は保存しない

    // ウィンドウサイズを変更
    if (isTauri()) {
      try {
        const width = newCompactMode ? 400 : 800;
        const height = 200;
        await invoke("set_window_size", { width, height });

        // ウィンドウのリサイズを無効化
        await invoke("set_window_resizable", { resizable: false });
      } catch (error) {
        console.error("Failed to set window size:", error);
      }
    }
  }, [settings]);

  // キーボードイベントハンドラー
  const handleKeyDown = useCallback(
    async (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();

      // 数字キー（0-9）の処理
      if (key >= "0" && key <= "9") {
        // タイマーが実行中の場合はキーボード入力を無効化
        if (timerState.isRunning) {
          return;
        }
        event.preventDefault();
        const number = parseInt(key, 10);

        // 現在の時間を取得
        const currentMinutes = timerState.minutes;
        const currentSeconds = timerState.seconds;

        // 文字列操作による左シフト動作（TimerControls.tsxと同じロジック）
        // 現在の分と秒を文字列として取得（例：00:02 → "0002"）
        const currentTimeString = `${currentMinutes.toString().padStart(2, "0")}${currentSeconds
          .toString()
          .padStart(2, "0")}`;

        // 左にシフトして新しい数字を右端に追加（例："0002" → "0020" → "0023"）
        const shiftedString = currentTimeString.slice(1) + number.toString();

        // 文字列を分と秒に変換（4文字であることを確認）
        if (shiftedString.length === 4) {
          const newMinutes = parseInt(shiftedString.slice(0, 2), 10);
          const newSeconds = parseInt(shiftedString.slice(2, 4), 10);

          // 両方の値を一度に更新
          updateTimerBoth(newMinutes, newSeconds);
        }
      }

      // S、Space、EnterキーでSTART/PAUSE操作
      else if (
        key === "s" ||
        event.key === " " ||
        event.key === "Enter"
      ) {
        event.preventDefault();
        // 00:00の場合はStartを無効化
        if (timerState.minutes === 0 && timerState.seconds === 0) {
          return;
        }
        if (timerState.isRunning) {
          pauseTimer();
        } else {
          startTimer();
        }
      }

      // RキーでRESET
      else if (key === "r") {
        event.preventDefault();
        resetTimer();
      }

      // Vキーで簡易表示モード切り替え
      else if (key === "v") {
        event.preventDefault();

        // 現在の状態を直接取得して切り替え
        const newCompactMode = !settings.compactMode;

        const newSettings = { ...settings, compactMode: newCompactMode };
        setSettings(newSettings);

        // ウィンドウサイズを変更
        if (isTauri()) {
          try {
            const width = newCompactMode ? 400 : 800;
            const height = 200;
            await invoke("set_window_size", { width, height });

            // ウィンドウのリサイズを無効化
            await invoke("set_window_resizable", { resizable: false });
          } catch (error) {
            console.error("Failed to set window size:", error);
          }
        }
      }
    },
    [timerState, startTimer, pauseTimer, resetTimer, updateTimerBoth, settings]
  );

  // キーボードイベントリスナーの設定
  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  // Time Upウィンドウからのメッセージリスナー
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log('Received message:', event.data);
      if (event.data?.action === 'closeTimeUpWindow') {
        console.log('Received closeTimeUpWindow message');
        if (isTauri()) {
          // Time Upウィンドウのみを閉じる
          invoke("hide_timeup_window").catch((error) => {
            console.error("Failed to hide Time Up window:", error);
          });
        }
      }
    };

    // localStorage監視
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'closeTimeUpWindow') {
        console.log('Received localStorage closeTimeUpWindow signal');
        if (isTauri()) {
          // Time Upウィンドウのみを閉じる
          invoke("hide_timeup_window").catch((error) => {
            console.error("Failed to hide Time Up window:", error);
          });
        }
      }
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return (
    <div
      className={`app ${settings.darkMode ? "dark" : "light"} ${settings.compactMode ? "compact" : ""}`}
      onMouseDown={handleDragStart}
      onMouseUp={handleMouseUp}
    >
      {/* 電源ボタン */}
      <button
        className="power-button"
        onClick={handlePowerButtonClick}
        title="アプリケーションを終了"
      >
        <img src="/icon/power.svg" width="16" height="16" alt="Power" />
      </button>

      {/* 簡易表示モード切り替えボタン */}
      <button
        className="compact-toggle-button"
        onClick={handleCompactModeToggle}
        title={settings.compactMode ? "通常表示に戻す" : "簡易表示モード"}
      >
        {settings.compactMode ? "⧉" : "⊡"}
      </button>

      <div className="timer-container">
        <TimerDisplay
          minutes={timerState.minutes}
          seconds={timerState.seconds}
          isRunning={timerState.isRunning}
        />

        {!settings.compactMode && (
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
        )}
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
