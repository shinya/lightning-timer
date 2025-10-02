import React from "react";
import { SettingsProps } from "../types";

const Settings: React.FC<SettingsProps> = ({
  settings,
  onClose,
  onSettingsChange,
}) => {
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
    onSettingsChange({
      ...settings,
      alarmSound: sound,
    });
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
          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={settings.alwaysOnTop}
                onChange={(e) => handleAlwaysOnTopChange(e.target.checked)}
              />
              Always on top
            </label>
          </div>

          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={settings.darkMode}
                onChange={(e) => handleDarkModeChange(e.target.checked)}
              />
              Dark mode
            </label>
          </div>

          <div className="setting-item alarm-sound-selector">
            <label>
              <span>Alarm Sound:</span>
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
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
