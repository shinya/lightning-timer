import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
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
    console.log('DEBUG: listen function:', listen);
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
            return {
              ...prev,
              isRunning: false,
              timeRemaining: 0,
              minutes: 0,
              seconds: 0
            };
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
    setTimerState(prev => ({
      ...prev,
      minutes,
      seconds,
      timeRemaining: totalSeconds
    }));
  }, []);

  const startTimer = () => {
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
    setTimerState(prev => ({
      ...prev,
      isRunning: false,
      isPaused: false,
      minutes: 0,
      seconds: 0,
      timeRemaining: 0
    }));
  };

  const openNumberPad = async () => {
    try {
      console.log('DEBUG: Attempting to open number pad...');
      await invoke('open_numberpad');
      console.log('DEBUG: Number pad command executed successfully');
    } catch (error) {
      console.error('DEBUG: Failed to open number pad:', error);
    }
  };

  // ナンバーパッドからの入力イベントをリッスン
  useEffect(() => {
    console.log('DEBUG: Setting up number-input event listener');
    const unlisten = listen('number-input', (event: { payload: { number: string } }) => {
      console.log('DEBUG: Received number input event:', event);
      const input = event.payload.number;
      // 右から順に挿入する仕様
      const currentTotal = timerState.minutes * 60 + timerState.seconds;
      const newTotal = Math.floor((currentTotal * 10 + parseInt(input)) % 10000);
      const newMinutes = Math.floor(newTotal / 60);
      const newSeconds = newTotal % 60;

      console.log('DEBUG: Current total:', currentTotal, 'New total:', newTotal, 'New minutes:', newMinutes, 'New seconds:', newSeconds);
      updateTimer(newMinutes, newSeconds);
    });

    return () => {
      console.log('DEBUG: Cleaning up number-input event listener');
      unlisten.then(fn => fn());
    };
  }, [timerState.minutes, timerState.seconds, updateTimer]);

  // F12キーでデベロッパーツールを開く
  useEffect(() => {
    const handleKeyDown = async (event: KeyboardEvent) => {
      if (event.key === 'F12') {
        event.preventDefault();
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
          onNumberPad={openNumberPad}
          onSettings={() => setShowSettings(true)}
          onMinutesChange={(minutes) => updateTimer(minutes, timerState.seconds)}
          onSecondsChange={(seconds) => updateTimer(timerState.minutes, seconds)}
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
