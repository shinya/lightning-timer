import React from 'react';
import { TimerDisplayProps } from '../types';

const TimerDisplay: React.FC<TimerDisplayProps> = ({ minutes, seconds, isRunning }) => {
  const formatTime = (value: number): string => {
    return value.toString().padStart(2, '0');
  };

  return (
    <div className={`timer-display ${isRunning ? 'running' : ''}`}>
      <div className="time">
        <span className="minutes">{formatTime(minutes)}</span>
        <span className="separator">:</span>
        <span className="seconds">{formatTime(seconds)}</span>
      </div>
      <div className="status">
        {isRunning ? 'Running' : 'Stopped'}
      </div>
    </div>
  );
};

export default TimerDisplay;
