import React from 'react';
import { SettingsProps } from '../types';

const Settings: React.FC<SettingsProps> = ({ settings, onClose, onSettingsChange }) => {
  const handleAlwaysOnTopChange = (checked: boolean) => {
    onSettingsChange({
      ...settings,
      alwaysOnTop: checked
    });
  };

  const handleDarkModeChange = (checked: boolean) => {
    onSettingsChange({
      ...settings,
      darkMode: checked
    });
  };

  return (
    <div className="settings-overlay">
      <div className="settings">
        <div className="settings-header">
          <h3>Settings</h3>
          <button className="close-btn" onClick={onClose}>×</button>
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
        </div>

        <div className="settings-footer">
          <button className="settings-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
