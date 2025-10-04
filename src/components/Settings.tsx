import React, { useState, useRef } from "react";
import { SettingsProps } from "../types";

const Settings: React.FC<SettingsProps> = ({
  settings,
  onClose,
  onSettingsChange,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const handleAlwaysOnTopChange = (checked: boolean) => {
    onSettingsChange({
      ...settings,
      alwaysOnTop: checked,
    });
  };

  const handleDarkModeChange = (checked: boolean) => {
    onSettingsChange({
      ...settings,
      darkMode: checked,
    });
  };

  const handleAlarmSoundChange = (sound: string) => {
    // 再生中の場合、停止する
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
      setIsPlaying(false);
    }

    onSettingsChange({
      ...settings,
      alarmSound: sound,
    });
  };

  const handleShowTimeUpWindowChange = (checked: boolean) => {
    onSettingsChange({
      ...settings,
      showTimeUpWindow: checked,
    });
  };

  const handleTestSound = () => {
    if (isPlaying) {
      // 停止
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
      setIsPlaying(false);
    } else {
      // 再生
      const audio = new Audio(`/sounds/${settings.alarmSound}`);
      audio.volume = settings.alarmVolume;
      audioRef.current = audio;

      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        audioRef.current = null;
      });

      audio.addEventListener('error', () => {
        console.error("Failed to play test sound");
        setIsPlaying(false);
        audioRef.current = null;
      });

      audio.play().then(() => {
        setIsPlaying(true);
      }).catch((error) => {
        console.error("Failed to play test sound:", error);
        setIsPlaying(false);
        audioRef.current = null;
      });
    }
  };

  // アラーム音の選択肢
  const alarmSounds = [
    { value: "alarm.mp3", label: "alarm" },
    { value: "gong.mp3", label: "gong" },
    { value: "marimba.mp3", label: "marimba" },
    { value: "pulse.mp3", label: "pulse" },
    { value: "symbal.mp3", label: "symbal" },
  ];

  return (
    <div className="settings-overlay">
      <div className="settings">
        <div className="settings-header">
          <h3>Settings</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="settings-content">
          <div className="setting-item checkbox-group">
            <div className="checkbox-group-inner">
              <label>
                <input
                  type="checkbox"
                  checked={settings.alwaysOnTop}
                  onChange={(e) => handleAlwaysOnTopChange(e.target.checked)}
                />
                Always on top
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={settings.darkMode}
                  onChange={(e) => handleDarkModeChange(e.target.checked)}
                />
                Dark mode
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={settings.showTimeUpWindow}
                  onChange={(e) => handleShowTimeUpWindowChange(e.target.checked)}
                />
                Show Time Up window
              </label>
            </div>
          </div>

          <div className="setting-item alarm-sound-selector">
            <label>
              <span>Alarm Sound:</span>
              <div className="alarm-sound-controls">
                <select
                  value={settings.alarmSound}
                  onChange={(e) => handleAlarmSoundChange(e.target.value)}
                  className="alarm-sound-select"
                >
                  {alarmSounds.map((sound) => (
                    <option key={sound.value} value={sound.value}>
                      {sound.label}
                    </option>
                  ))}
                </select>
                <button
                  className="test-sound-btn"
                  onClick={handleTestSound}
                  title={isPlaying ? "音を停止" : "音を試聴"}
                >
                  {isPlaying ? "⏹" : "▶"}
                </button>
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
