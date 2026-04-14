import React, { useState, useEffect, useCallback, useRef } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow, currentMonitor, LogicalSize, PhysicalPosition } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { Store } from "@tauri-apps/plugin-store";
import TimerDisplay from "./components/TimerDisplay";
import TimerControls from "./components/TimerControls";
import Help from "./components/Help";
import AboutInfo from "./components/AboutInfo";
import { TimerState, Settings as SettingsType } from "./types";
import { useTranslation } from "./i18n/useTranslation";
import { initLanguage } from "./i18n";
import type { LanguageSetting } from "./i18n";

const App: React.FC = () => {
  const { t, setLanguage: setI18nLanguage } = useTranslation();

  // Tauri APIの状態を確認
  useEffect(() => {
    // Tauri APIの初期化確認
  }, []);

  // ウィンドウ状態の復元と保存（プラグインが自動処理するため無効化）
  useEffect(() => {
    if (!isTauri()) return;

    // プラグインが自動的に復元・保存を処理するため、手動処理は無効化
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
    displayMode: "normal", // 常に通常モードで起動
    showTimeUpWindow: true, // デフォルトでTime Up画面を表示
    layerTextColor: "#00ff66",
    layerShadowStyle: "dark",
    layerFontSize: 6,
    language: "auto",
  });

  // TimeUP表示の状態管理
  const [showTimeUp, setShowTimeUp] = useState(false);

  // フルスクリーン状態管理
  const [isFullscreen, setIsFullscreen] = useState(false);

  // フルスクリーン前のウィンドウ位置を保存
  const savedWindowGeometryRef = useRef<{ x: number; y: number } | null>(null);

  // アラーム再生フラグ（重複再生を防ぐ）
  const alarmPlayedRef = useRef(false);

  // アラーム音の参照（停止用）
  const alarmAudioRef = useRef<HTMLAudioElement | null>(null);

  // アラーム音を停止する関数
  const stopAlarm = useCallback(() => {
    if (alarmAudioRef.current) {
      alarmAudioRef.current.pause();
      alarmAudioRef.current.currentTime = 0;
      alarmAudioRef.current = null;
    }
    alarmPlayedRef.current = false;
  }, []);

  // ポート動的設定
  const setupPort = useCallback(async () => {
    if (!isTauri()) return 1420; // 開発時は固定ポート

    try {
      // 製品ビルド時のみ動的ポート取得
      // 開発時は1420番ポートを使用
      const port = await invoke("get_available_port");
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
      const savedSettings = await settings.get<Partial<SettingsType> & { compactMode?: boolean }>("settings");
      if (savedSettings) {
        // 古い形式（compactMode: boolean）との互換性
        const convertedSettings: SettingsType = {
          alwaysOnTop: savedSettings.alwaysOnTop ?? false,
          darkMode: savedSettings.darkMode ?? false,
          alarmSound: savedSettings.alarmSound ?? "alarm.mp3",
          alarmVolume: savedSettings.alarmVolume ?? 0.8,
          displayMode: (savedSettings.displayMode === "compact" || savedSettings.displayMode === "minimal" ? savedSettings.displayMode : (savedSettings.compactMode ? "compact" : "normal")),
          showTimeUpWindow: savedSettings.showTimeUpWindow ?? true,
          layerTextColor: savedSettings.layerTextColor ?? "#00ff66",
          layerShadowStyle: savedSettings.layerShadowStyle ?? "dark",
          layerFontSize: typeof savedSettings.layerFontSize === "number" && savedSettings.layerFontSize > 0
            ? savedSettings.layerFontSize
            : 6,
          language: savedSettings.language === "en" || savedSettings.language === "ja" || savedSettings.language === "auto"
            ? savedSettings.language
            : "auto",
        };
        setSettings(convertedSettings);
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
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  }, []);

  const [showHelp, setShowHelp] = useState(false);
  const [showAboutInfo, setShowAboutInfo] = useState(false);

  const openSettings = useCallback(async () => {
    if (!isTauri()) return;
    try {
      await invoke("show_settings_window");
    } catch (err) {
      console.error("Failed to open settings window:", err);
    }
  }, []);

  // 最後に設定した時間を記憶する状態
  const [lastSetTime, setLastSetTime] = useState<{
    minutes: number;
    seconds: number;
  } | null>(null);
  const timeUpWindowShownRef = useRef(false);

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
      }
    } catch (error) {
      console.error("Failed to load timer state:", error);
    }
  }, []);


  // タイマー状態の保存・読み込み
  useEffect(() => {
    let interval: number | null = null;

    // playAlarm関数をuseEffect内で定義（最新のsettingsを参照）
    const playAlarmInEffect = async () => {
      const audio = new Audio(`/sounds/${settings.alarmSound}`);
      audio.volume = settings.alarmVolume;
      alarmAudioRef.current = audio; // 参照を保持

      // 音声終了時の処理
      audio.addEventListener('ended', () => {
        alarmAudioRef.current = null;
        alarmPlayedRef.current = false;
      });

      // エラー時の処理
      audio.addEventListener('error', () => {
        alarmAudioRef.current = null;
        alarmPlayedRef.current = false;
      });

      try {
        await audio.play();
      } catch (error) {
        console.error("Failed to play alarm sound:", error);
        alarmAudioRef.current = null;
        alarmPlayedRef.current = false;
      }
    };

    if (timerState.isRunning && timerState.timeRemaining > 0) {
      interval = setInterval(() => {
        setTimerState((prev) => {
          const newTimeRemaining = prev.timeRemaining - 1;
          if (newTimeRemaining <= 0) {
            // タイマー終了
            // TimeUP表示を有効化
            setShowTimeUp(true);

            // 音声再生を開始（重複再生を防ぐ）
            if (!alarmPlayedRef.current) {
              alarmPlayedRef.current = true;
              playAlarmInEffect().catch((error) => {
                console.error("Failed to start alarm sound:", error);
              });
            }

            // 音声再生開始後、設定に応じてウィンドウを表示（重複実行を防ぐ）
            if (!timeUpWindowShownRef.current && settings.showTimeUpWindow) {
              timeUpWindowShownRef.current = true;
              setTimeout(() => {
                if (isTauri()) {
                  invoke("show_timeup_window").catch((error) => {
                    console.error("Failed to show Time Up window:", error);
                  });
                }
              }, 100); // 100ms遅延で音声再生を優先
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
  }, [timerState.isRunning, timerState.timeRemaining, lastSetTime, settings.alarmSound, settings.alarmVolume, settings.showTimeUpWindow, stopAlarm]);

  const updateTimer = useCallback((minutes: number, seconds: number) => {
    // アラーム音を停止
    stopAlarm();

    const totalSeconds = minutes * 60 + seconds;
    setTimerState((prev) => {
      const newState = {
        ...prev,
        minutes,
        seconds,
        timeRemaining: totalSeconds,
      };
      return newState;
    });
  }, [stopAlarm]);

  const updateTimerBoth = useCallback(
    async (minutes: number, seconds: number) => {
      // TimeUP表示を消す
      setShowTimeUp(false);

      // アラーム音を停止
      stopAlarm();

      const totalSeconds = minutes * 60 + seconds;

      setTimerState((prev) => {
        const newState = {
          ...prev,
          minutes,
          seconds,
          timeRemaining: totalSeconds,
        };
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
        } catch (error) {
          console.error("Failed to save timer state immediately:", error);
        }
      }
    },
    [lastSetTime, stopAlarm]
  );

  const startTimer = useCallback(() => {
    // TimeUP表示を消す
    setShowTimeUp(false);

    // アラーム音を停止
    stopAlarm();

    // 新規開始時（一時停止からの再開でない場合）は現在の時間を記憶
    if (!timerState.isPaused) {
      setLastSetTime({
        minutes: timerState.minutes,
        seconds: timerState.seconds,
      });
    }

    setTimerState((prev) => ({
      ...prev,
      isRunning: true,
      isPaused: false,
    }));
  }, [timerState.minutes, timerState.seconds, timerState.isPaused, stopAlarm]);

  const pauseTimer = useCallback(() => {
    setTimerState((prev) => ({
      ...prev,
      isRunning: false,
      isPaused: true,
    }));
  }, []);

  const resetTimer = useCallback(() => {
    // TimeUP表示を消す
    setShowTimeUp(false);

    // アラーム音を停止
    stopAlarm();

    // リセット時に記憶もクリア
    setLastSetTime(null);

    setTimerState((prev) => ({
      ...prev,
      isRunning: false,
      isPaused: false,
      minutes: 0,
      seconds: 0,
      timeRemaining: 0,
    }));
  }, [stopAlarm]);

  // F12キーでデベロッパーツールを開く
  useEffect(() => {
    const handleKeyDown = async (event: KeyboardEvent) => {
      if (event.key === "F12") {
        event.preventDefault();
        if (!isTauri()) {
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

  // 設定ウィンドウから配信された設定を反映する（保存はせず副作用は useEffect で吸収）
  const applyExternalSettings = useCallback(
    async (newSettings: SettingsType) => {
      setSettings(newSettings);
      // 言語が変わった場合はi18nも同期
      initLanguage(newSettings.language);
      setI18nLanguage(newSettings.language as LanguageSetting);
    },
    [setI18nLanguage]
  );

  // alwaysOnTop はストア起動読み込み時にも外部変更時にも自動で OS 側へ反映
  useEffect(() => {
    if (!isTauri()) return;
    const currentWindow = getCurrentWindow();
    currentWindow.setAlwaysOnTop(settings.alwaysOnTop).catch((error) => {
      console.error("Failed to apply alwaysOnTop:", error);
    });
  }, [settings.alwaysOnTop]);

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
    // マウス操作でTimeUP表示を消す
    setShowTimeUp(false);

    // アラーム音を停止
    stopAlarm();

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

  // 表示モード遷移の共通ロジック
  const transitionToMode = useCallback(
    async (nextMode: "normal" | "compact" | "minimal") => {
      const prevMode = settings.displayMode;
      if (prevMode === nextMode) return;

      const newSettings = { ...settings, displayMode: nextMode };
      setSettings(newSettings);
      // 表示モードの状態は保存しない

      if (!isTauri()) return;

      const currentWindow = getCurrentWindow();

      try {
        // フルスクリーン中はモード切り替え時に解除
        if (isFullscreen) {
          setIsFullscreen(false);
          if (savedWindowGeometryRef.current) {
            const { x, y } = savedWindowGeometryRef.current;
            await currentWindow.setPosition(new PhysicalPosition(x, y));
            savedWindowGeometryRef.current = null;
          }
        }

        let width: number;
        let height: number;
        if (nextMode === "normal") {
          width = 800;
          height = 200;
        } else if (nextMode === "compact") {
          width = 400;
          height = 200;
        } else {
          // minimal
          width = 200;
          height = 100;
        }

        await currentWindow.setMinSize(null);
        await currentWindow.setMaxSize(null);
        await invoke("set_window_size", { width, height });
        const size = new LogicalSize(width, height);
        await currentWindow.setMinSize(size);
        await currentWindow.setMaxSize(size);
      } catch (error) {
        console.error("Failed to transition display mode:", error);
      }
    },
    [settings, isFullscreen]
  );

  const handleCompactModeToggle = useCallback(async () => {
    // 通常 → 簡易 → ミニマム → 通常の順で循環
    const nextMode: "normal" | "compact" | "minimal" =
      settings.displayMode === "normal" ? "compact" :
      settings.displayMode === "compact" ? "minimal" :
      "normal";
    await transitionToMode(nextMode);
  }, [settings.displayMode, transitionToMode]);

  // レイヤー表示の有効/無効（永続化しない）
  const [layerEnabled, setLayerEnabled] = useState(false);

  const toggleLayer = useCallback(async () => {
    if (!isTauri()) {
      setLayerEnabled((v) => !v);
      return;
    }
    const next = !layerEnabled;
    try {
      if (next) {
        await invoke("show_layer_window");
      } else {
        await invoke("hide_layer_window");
      }
      setLayerEnabled(next);
    } catch (error) {
      console.error("Failed to toggle layer:", error);
    }
  }, [layerEnabled]);

  // フルスクリーン切り替え（手動フルスクリーン：ネイティブのsetFullscreenはmacOSデュアルディスプレイで問題があるため使わない）
  const handleFullscreenToggle = useCallback(async () => {
    if (!isTauri()) return;

    try {
      const currentWindow = getCurrentWindow();
      const newFullscreen = !isFullscreen;

      if (newFullscreen) {
        // フルスクリーン前のウィンドウ位置を保存
        const position = await currentWindow.outerPosition();
        savedWindowGeometryRef.current = { x: position.x, y: position.y };

        // 現在のモニター情報を取得
        const monitor = await currentMonitor();
        if (!monitor) {
          console.error("Failed to get current monitor");
          return;
        }

        // サイズ制約を解除してモニターサイズに拡大
        await currentWindow.setMinSize(null);
        await currentWindow.setMaxSize(null);

        // モニターの論理サイズを計算
        const logicalWidth = Math.round(monitor.size.width / monitor.scaleFactor);
        const logicalHeight = Math.round(monitor.size.height / monitor.scaleFactor);

        // モニターの左上に移動してから全画面サイズに変更
        await currentWindow.setPosition(monitor.position);
        await invoke("set_window_size", { width: logicalWidth, height: logicalHeight });
      } else {
        // 元のモードのウィンドウサイズに戻す
        let width: number;
        let height: number;
        if (settings.displayMode === "compact") {
          width = 400;
          height = 200;
        } else if (settings.displayMode === "minimal") {
          width = 200;
          height = 100;
        } else {
          width = 800;
          height = 200;
        }

        // サイズ制約を一旦解除してからリサイズ
        await currentWindow.setMinSize(null);
        await currentWindow.setMaxSize(null);

        // 保存しておいた位置に先に戻す（リサイズ前にモニター内に戻す）
        if (savedWindowGeometryRef.current) {
          const { x, y } = savedWindowGeometryRef.current;
          await currentWindow.setPosition(new PhysicalPosition(x, y));
          savedWindowGeometryRef.current = null;
        }

        await invoke("set_window_size", { width, height });

        // min/maxサイズ制約でリサイズを防止
        const size = new LogicalSize(width, height);
        await currentWindow.setMinSize(size);
        await currentWindow.setMaxSize(size);
      }

      setIsFullscreen(newFullscreen);

      // WKWebViewのフォーカスを復帰
      await new Promise(resolve => setTimeout(resolve, 50));
      await invoke("focus_window");
    } catch (error) {
      console.error("Failed to toggle fullscreen:", error);
    }
  }, [isFullscreen, settings.displayMode]);

  // キーボードイベントハンドラー
  const handleKeyDown = useCallback(
    async (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();

      // キーボード入力でTimeUP表示を消す
      setShowTimeUp(false);

      // アラーム音を停止
      stopAlarm();

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

      // Cmd+Enter (Mac) / Ctrl+Enter (Windows/Linux) でフルスクリーン切り替え
      else if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        handleFullscreenToggle();
        return;
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

      // Vキーで表示モード切り替え（通常 → 簡易 → ミニマム → 通常）
      else if (key === "v") {
        event.preventDefault();
        const nextMode: "normal" | "compact" | "minimal" =
          settings.displayMode === "normal" ? "compact" :
          settings.displayMode === "compact" ? "minimal" :
          "normal";
        await transitionToMode(nextMode);
      }

      // Lキーでレイヤー表示の ON/OFF 切り替え
      else if (key === "l") {
        event.preventDefault();
        await toggleLayer();
      }
    },
    [timerState, startTimer, pauseTimer, resetTimer, updateTimerBoth, settings.displayMode, stopAlarm, handleFullscreenToggle, transitionToMode, toggleLayer]
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
      if (event.data?.action === 'closeTimeUpWindow') {
        timeUpWindowShownRef.current = false; // フラグをリセット
        // アラーム音を停止
        stopAlarm();
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
        timeUpWindowShownRef.current = false; // フラグをリセット
        // アラーム音を停止
        stopAlarm();
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
  }, [stopAlarm]);

  // レイヤー表示中、タイマー状態をオーバーレイへ直接反映 (webview.eval 経由)
  useEffect(() => {
    if (!isTauri()) return;
    if (!layerEnabled) return;

    invoke("update_layer_timer", {
      minutes: timerState.minutes,
      seconds: timerState.seconds,
      showTimeUp,
    }).catch((error) => {
      console.error("Failed to update layer timer:", error);
    });
  }, [
    layerEnabled,
    timerState.minutes,
    timerState.seconds,
    showTimeUp,
  ]);

  // レイヤー表示中、文字色・影スタイルの変更を反映
  // (event だと到達しないことがあるため Rust の webview.eval で直接更新)
  useEffect(() => {
    if (!isTauri()) return;
    if (!layerEnabled) return;

    invoke("update_layer_style", {
      color: settings.layerTextColor,
      shadow: settings.layerShadowStyle,
      fontSize: settings.layerFontSize,
    }).catch((error) => {
      console.error("Failed to update layer style:", error);
    });
  }, [layerEnabled, settings.layerTextColor, settings.layerShadowStyle, settings.layerFontSize]);

  // レイヤーウィンドウからの退出要求を受信
  useEffect(() => {
    if (!isTauri()) return;

    const unlistenPromise = listen("layer-exit-requested", () => {
      invoke("hide_layer_window").catch(() => {});
      setLayerEnabled(false);
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten()).catch(() => {});
    };
  }, []);

  // 設定ウィンドウからの設定変更を反映
  useEffect(() => {
    if (!isTauri()) return;

    const unlistenPromise = listen<SettingsType>("settings-changed", (event) => {
      applyExternalSettings(event.payload);
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten()).catch(() => {});
    };
  }, [applyExternalSettings]);

  // レイヤーウィンドウ初期化時に現在値とスタイルを即時送信
  useEffect(() => {
    if (!isTauri()) return;

    const unlistenPromise = listen("layer-ready", () => {
      invoke("update_layer_style", {
        color: settings.layerTextColor,
        shadow: settings.layerShadowStyle,
        fontSize: settings.layerFontSize,
      }).catch((error) => {
        console.error("Failed to update layer style on ready:", error);
      });
      invoke("update_layer_timer", {
        minutes: timerState.minutes,
        seconds: timerState.seconds,
        showTimeUp,
      }).catch((error) => {
        console.error("Failed to update layer timer on ready:", error);
      });
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten()).catch(() => {});
    };
  }, [
    timerState.minutes,
    timerState.seconds,
    timerState.isRunning,
    showTimeUp,
    settings.layerTextColor,
    settings.layerShadowStyle,
    settings.layerFontSize,
  ]);

  return (
    <div
      className={`app ${settings.darkMode ? "dark" : "light"} ${settings.displayMode === "compact" ? "compact" : ""} ${settings.displayMode === "minimal" ? "minimal" : ""} ${isFullscreen ? "fullscreen" : ""}`}
      onMouseDown={handleDragStart}
      onMouseUp={handleMouseUp}
    >
      {/* 電源ボタン */}
      <button
        className="power-button"
        onClick={handlePowerButtonClick}
        title={t("tooltips.exitApp")}
      >
        <img src="/icon/power.svg" width="16" height="16" alt="Power" />
      </button>

      {/* 表示モード切り替えボタン */}
      <button
        className="compact-toggle-button"
        onClick={handleCompactModeToggle}
        title={
          settings.displayMode === "normal" ? t("tooltips.compactMode") :
          settings.displayMode === "compact" ? t("tooltips.minimalMode") :
          t("tooltips.normalMode")
        }
      >
        {settings.displayMode === "normal" ? (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="1" y="3" width="14" height="10" rx="1.5" />
            <line x1="1" y1="6" x2="15" y2="6" />
          </svg>
        ) : settings.displayMode === "compact" ? (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="4" width="10" height="8" rx="1.5" />
            <line x1="3" y1="7" x2="13" y2="7" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="5" y="5" width="6" height="6" rx="1" />
          </svg>
        )}
      </button>

      {/* レイヤー表示 ON/OFF ボタン */}
      <button
        className={`layer-toggle-button${layerEnabled ? " active" : ""}`}
        onClick={toggleLayer}
        title={layerEnabled ? t("tooltips.layerOff") : t("tooltips.layerOn")}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="1" y="4" width="10" height="8" rx="1" />
          <rect x="5" y="1" width="10" height="8" rx="1" />
        </svg>
      </button>

      {/* フルスクリーン切り替えボタン（右上） - 簡易モードのみ表示 */}
      {settings.displayMode === "compact" && (
        <button
          className="fullscreen-toggle-button"
          onClick={handleFullscreenToggle}
          title={isFullscreen ? t("tooltips.windowMode") : t("tooltips.fullscreen")}
        >
          {isFullscreen ? (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="5,1 1,1 1,5" />
              <polyline points="11,15 15,15 15,11" />
              <polyline points="15,5 15,1 11,1" />
              <polyline points="1,11 1,15 5,15" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="1,5 1,1 5,1" />
              <polyline points="15,11 15,15 11,15" />
              <polyline points="11,1 15,1 15,5" />
              <polyline points="5,15 1,15 1,11" />
            </svg>
          )}
        </button>
      )}

      {/* 情報アイコンボタン（右下） - 通常モードと簡易モードのみ表示 */}
      {settings.displayMode !== "minimal" && (
        <button
          className="info-button"
          onClick={() => setShowAboutInfo(true)}
          title={t("tooltips.appInfo")}
        >
          <i className="fas fa-info-circle"></i>
        </button>
      )}

      <div className="timer-container">
        <TimerDisplay
          minutes={timerState.minutes}
          seconds={timerState.seconds}
          isRunning={timerState.isRunning}
          showTimeUp={showTimeUp}
        />

        {settings.displayMode === "normal" && (
          <TimerControls
            minutes={timerState.minutes}
            seconds={timerState.seconds}
            isRunning={timerState.isRunning}
            onStart={startTimer}
            onPause={pauseTimer}
            onReset={resetTimer}
            onSettings={openSettings}
            onHelp={() => setShowHelp(true)}
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

      {showHelp && (
        <Help onClose={() => setShowHelp(false)} />
      )}

      {showAboutInfo && (
        <AboutInfo onClose={() => setShowAboutInfo(false)} />
      )}
    </div>
  );
};

export default App;
