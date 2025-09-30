import React from 'react';
import { TimerControlsProps } from '../types';

const TimerControls: React.FC<TimerControlsProps> = ({
  minutes,
  seconds,
  isRunning,
  onStart,
  onPause,
  onReset,
  onSettings,
  onMinutesChange,
  onSecondsChange,
  onNumberInput
}) => {
  const handleNumberClick = (number: number) => {
    onNumberInput(number);
  };
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
        {!isRunning ? (
          <button className="control-btn start" onClick={onStart}>
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
      </div>
    </div>
  );
};

export default TimerControls;
