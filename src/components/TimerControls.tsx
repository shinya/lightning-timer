import React from 'react';
import { TimerControlsProps } from '../types';

const TimerControls: React.FC<TimerControlsProps> = ({
  minutes,
  seconds,
  isRunning,
  onStart,
  onPause,
  onReset,
  onNumberPad,
  onSettings,
  onMinutesChange,
  onSecondsChange
}) => {
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

        <button
          className="control-btn number-pad-btn"
          onClick={onNumberPad}
          disabled={isRunning}
        >
          Num
        </button>

        <button className="control-btn settings-btn" onClick={onSettings}>
          Settings
        </button>
      </div>
    </div>
  );
};

export default TimerControls;
