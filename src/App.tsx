import React, { useState, useEffect, useCallback } from 'react';
import { invoke, isTauri } from '@tauri-apps/api/core';
import TimerDisplay from './components/TimerDisplay';
import TimerControls from './components/TimerControls';
import Settings from './components/Settings';
import { TimerState, Settings as SettingsType } from './types';

const App: React.FC = () => {
  // デバッグ: Tauri APIの状態を確認
  useEffect(() => {
    console.log('DEBUG: Tauri API check');
    console.log('DEBUG: window.__TAURI__:', (window as unknown as { __TAURI__?: unknown }).__TAURI__);
    console.log('DEBUG: invoke function:', invoke);
  }, []);

  const [timerState, setTimerState] = useState<TimerState>({
    minutes: 0,
    seconds: 0,
    isRunning: false,
    isPaused: false,
    timeRemaining: 0
  });

  const [settings, setSettings] = useState<SettingsType>({
    alwaysOnTop: false,
    darkMode: false
  });

  const [showSettings, setShowSettings] = useState(false);

  // 最後に設定した時間を記憶する状態
  const [lastSetTime, setLastSetTime] = useState<{ minutes: number; seconds: number } | null>(null);
  const [hasNumberBeenEdited, setHasNumberBeenEdited] = useState(false);

  // タイマーのロジック
  useEffect(() => {
    let interval: number | null = null;

    if (timerState.isRunning && timerState.timeRemaining > 0) {
      interval = setInterval(() => {
        setTimerState(prev => {
          const newTimeRemaining = prev.timeRemaining - 1;
          if (newTimeRemaining <= 0) {
            // タイマー終了
            playAlarm();
            // 最後に設定した時間があれば復元
            if (lastSetTime) {
              const restoredTotalSeconds = lastSetTime.minutes * 60 + lastSetTime.seconds;
              return {
                ...prev,
                isRunning: false,
                timeRemaining: restoredTotalSeconds,
                minutes: lastSetTime.minutes,
                seconds: lastSetTime.seconds
              };
            } else {
              return {
                ...prev,
                isRunning: false,
                timeRemaining: 0,
                minutes: 0,
                seconds: 0
              };
            }
          }
          return {
            ...prev,
            timeRemaining: newTimeRemaining,
            minutes: Math.floor(newTimeRemaining / 60),
            seconds: newTimeRemaining % 60
          };
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerState.isRunning, timerState.timeRemaining]);

  const playAlarm = () => {
    // Web Audio APIを使用してアラーム音を生成
    const audioContext = new (window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  const updateTimer = useCallback((minutes: number, seconds: number) => {
    const totalSeconds = minutes * 60 + seconds;
    console.log('DEBUG: updateTimer called with:', minutes, ':', seconds, 'total:', totalSeconds);
    setTimerState(prev => {
      const newState = {
        ...prev,
        minutes,
        seconds,
        timeRemaining: totalSeconds
      };
      console.log('DEBUG: updateTimer new state:', newState);
      return newState;
    });
  }, []);

  const updateTimerBoth = useCallback((minutes: number, seconds: number) => {
    const totalSeconds = minutes * 60 + seconds;
    console.log('DEBUG: updateTimerBoth called with:', minutes, ':', seconds, 'total:', totalSeconds);

    // 数字が編集されたことを記録
    setHasNumberBeenEdited(true);

    setTimerState(prev => {
      const newState = {
        ...prev,
        minutes,
        seconds,
        timeRemaining: totalSeconds
      };
      console.log('DEBUG: updateTimerBoth new state:', newState);
      return newState;
    });
  }, []);

  const startTimer = () => {
    // 数字が編集されていた場合のみ、現在の時間を記憶
    if (hasNumberBeenEdited) {
      setLastSetTime({ minutes: timerState.minutes, seconds: timerState.seconds });
      setHasNumberBeenEdited(false); // フラグをリセット
      console.log('DEBUG: Last set time saved:', timerState.minutes, ':', timerState.seconds);
    }

    setTimerState(prev => ({
      ...prev,
      isRunning: true,
      isPaused: false
    }));
  };

  const pauseTimer = () => {
    setTimerState(prev => ({
      ...prev,
      isRunning: false,
      isPaused: true
    }));
  };

  const resetTimer = () => {
    // リセット時に記憶もクリア
    setLastSetTime(null);
    setHasNumberBeenEdited(false);

    setTimerState(prev => ({
      ...prev,
      isRunning: false,
      isPaused: false,
      minutes: 0,
      seconds: 0,
      timeRemaining: 0
    }));
  };


  // F12キーでデベロッパーツールを開く
  useEffect(() => {
    const handleKeyDown = async (event: KeyboardEvent) => {
      if (event.key === 'F12') {
        event.preventDefault();
        if (!isTauri()) {
          console.log('DEBUG: Not running in Tauri environment, cannot open devtools');
          return;
        }
        try {
          await invoke('open_devtools');
        } catch (error) {
          console.error('Failed to open devtools:', error);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);


  return (
    <div className={`app ${settings.darkMode ? 'dark' : 'light'}`}>
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
          onMinutesChange={(minutes) => updateTimer(minutes, timerState.seconds)}
          onSecondsChange={(seconds) => updateTimer(timerState.minutes, seconds)}
          onBothChange={updateTimerBoth}
        />
      </div>


      {showSettings && (
        <Settings
          settings={settings}
          onClose={() => setShowSettings(false)}
          onSettingsChange={setSettings}
        />
      )}
    </div>
  );
};

export default App;
