import React, { useCallback } from "react";
import { TimerControlsProps } from "../types";

const TimerControls: React.FC<TimerControlsProps> = ({
  minutes,
  seconds,
  isRunning,
  onStart,
  onPause,
  onReset,
  onSettings,
  onHelp,
  onMinutesChange,
  onSecondsChange,
  onBothChange,
  alarmVolume,
  onAlarmVolumeChange,
}) => {
  const handleNumberClick = useCallback(
    (number: number) => {
      // 文字列操作による左シフト動作
      // 現在の分と秒を文字列として取得（例：00:02 → "0002"）
      const currentTimeString = `${minutes.toString().padStart(2, "0")}${seconds
        .toString()
        .padStart(2, "0")}`;

      // 左にシフトして新しい数字を右端に追加（例："0002" → "0020" → "0023"）
      const shiftedString = currentTimeString.slice(1) + number.toString();


      // 文字列を分と秒に変換（4文字であることを確認）
      if (shiftedString.length === 4) {
        const newMinutes = parseInt(shiftedString.slice(0, 2), 10);
        const newSeconds = parseInt(shiftedString.slice(2, 4), 10);


        // 両方の値を一度に更新
        onBothChange(newMinutes, newSeconds);

      } else {
        console.error(
          "Invalid shifted string length:",
          shiftedString.length,
          shiftedString
        );
      }
    },
    [minutes, seconds, onBothChange]
  );

  // キーボードイベントリスナー（App.tsxで処理されるため無効化）
  // useEffect(() => {
  //   const handleKeyDown = (event: KeyboardEvent) => {
  //     const key = event.key.toLowerCase();

  //     // 数字キー（0-9）の処理
  //     if (key >= "0" && key <= "9") {
  //       // タイマーが実行中の場合はキーボード入力を無効化
  //       if (isRunning) {
  //         return;
  //       }
  //       event.preventDefault(); // デフォルトの動作を防ぐ
  //       const number = parseInt(key, 10);
  //       handleNumberClick(number);
  //     }

  //     // SキーでSTART/PAUSE
  //     else if (key === "s") {
  //       event.preventDefault();
  //       // 00:00の場合はStartを無効化
  //       if (minutes === 0 && seconds === 0) {
  //         return;
  //       }
  //       if (isRunning) {
  //         onPause();
  //       } else {
  //         onStart();
  //       }
  //     }

  //     // RキーでRESET
  //     else if (key === "r") {
  //       event.preventDefault();
  //       onReset();
  //     }
  //   };

  //   // イベントリスナーを追加
  //   document.addEventListener("keydown", handleKeyDown);

  //   // クリーンアップ
  //   return () => {
  //     document.removeEventListener("keydown", handleKeyDown);
  //   };
  // }, [
  //   handleNumberClick,
  //   isRunning,
  //   onStart,
  //   onPause,
  //   onReset,
  //   minutes,
  //   seconds,
  // ]);
  const handleMinutesUp = () => {
    onMinutesChange(Math.min(99, minutes + 1));
  };

  const handleMinutesDown = () => {
    onMinutesChange(Math.max(0, minutes - 1));
  };

  const handleSecondsUp = () => {
    onSecondsChange(Math.min(59, seconds + 1));
  };

  const handleSecondsDown = () => {
    onSecondsChange(Math.max(0, seconds - 1));
  };

  return (
    <div className="timer-controls">
      <div className="controls-row">
        <div className="time-adjustment">
          <div className="time-section">
            <div className="label">Minutes</div>
            <div className="adjustment-controls">
              <button
                className="adjust-btn up"
                onClick={handleMinutesUp}
                disabled={isRunning}
              >
                ▲
              </button>
              <button
                className="adjust-btn down"
                onClick={handleMinutesDown}
                disabled={isRunning}
              >
                ▼
              </button>
            </div>
          </div>

          <div className="time-section">
            <div className="label">Seconds</div>
            <div className="adjustment-controls">
              <button
                className="adjust-btn up"
                onClick={handleSecondsUp}
                disabled={isRunning}
              >
                ▲
              </button>
              <button
                className="adjust-btn down"
                onClick={handleSecondsDown}
                disabled={isRunning}
              >
                ▼
              </button>
            </div>
          </div>
        </div>

        <div className="number-pad">
          <div className="number-row">
            <button
              className="number-btn"
              onClick={() => handleNumberClick(1)}
              disabled={isRunning}
            >
              1
            </button>
            <button
              className="number-btn"
              onClick={() => handleNumberClick(2)}
              disabled={isRunning}
            >
              2
            </button>
            <button
              className="number-btn"
              onClick={() => handleNumberClick(3)}
              disabled={isRunning}
            >
              3
            </button>
          </div>
          <div className="number-row">
            <button
              className="number-btn"
              onClick={() => handleNumberClick(4)}
              disabled={isRunning}
            >
              4
            </button>
            <button
              className="number-btn"
              onClick={() => handleNumberClick(5)}
              disabled={isRunning}
            >
              5
            </button>
            <button
              className="number-btn"
              onClick={() => handleNumberClick(6)}
              disabled={isRunning}
            >
              6
            </button>
          </div>
          <div className="number-row">
            <button
              className="number-btn"
              onClick={() => handleNumberClick(7)}
              disabled={isRunning}
            >
              7
            </button>
            <button
              className="number-btn"
              onClick={() => handleNumberClick(8)}
              disabled={isRunning}
            >
              8
            </button>
            <button
              className="number-btn"
              onClick={() => handleNumberClick(9)}
              disabled={isRunning}
            >
              9
            </button>
          </div>
          <div className="number-row">
            <button
              className="number-btn"
              onClick={() => handleNumberClick(0)}
              disabled={isRunning}
            >
              0
            </button>
          </div>
        </div>

        <div className="main-controls">
          <div className="main-controls-buttons">
            {!isRunning ? (
              <button
                className="control-btn start"
                onClick={onStart}
                disabled={minutes === 0 && seconds === 0}
                title={
                  minutes === 0 && seconds === 0
                    ? "時間を設定してください"
                    : "タイマーを開始"
                }
              >
                Start
              </button>
            ) : (
              <button className="control-btn pause" onClick={onPause}>
                Pause
              </button>
            )}

            <button className="control-btn reset" onClick={onReset}>
              Reset
            </button>

            <button className="control-btn settings-btn" onClick={onSettings}>
              Settings
            </button>

            <button className="control-btn help-btn" onClick={onHelp}>
              Help
            </button>
          </div>

          {/* ボリュームコントローラー */}
          <div className="main-controls-volume">
            <div className="volume-control-container">
              <div className="volume-control">
                <span className="volume-label">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                  </svg>
                </span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={alarmVolume}
                  onChange={(e) =>
                    onAlarmVolumeChange(parseFloat(e.target.value))
                  }
                  className="volume-slider"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimerControls;
