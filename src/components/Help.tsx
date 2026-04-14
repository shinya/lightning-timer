import React from "react";
import { useTranslation } from "../i18n/useTranslation";

interface HelpProps {
  onClose: () => void;
}

const Help: React.FC<HelpProps> = ({ onClose }) => {
  const { t } = useTranslation();

  const shortcuts = [
    { key: "0-9", description: t("help.shortcuts.numbers") },
    { key: "S", description: t("help.shortcuts.startPause") },
    { key: "Space", description: t("help.shortcuts.startPause") },
    { key: "Enter", description: t("help.shortcuts.startPause") },
    { key: "R", description: t("help.shortcuts.reset") },
    { key: "V", description: t("help.shortcuts.toggleCompactMode") },
    { key: "L", description: t("help.shortcuts.toggleLayer") },
    { key: "Cmd/Ctrl+Enter", description: t("help.shortcuts.toggleFullscreen") },
  ];

  return (
    <div className="help-overlay" onClick={onClose}>
      <div className="help" onClick={(e) => e.stopPropagation()}>
        <div className="help-header">
          <h3>{t("help.title")}</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="help-content">
          <table className="shortcuts-table">
            <thead>
              <tr>
                <th>{t("help.keyColumn")}</th>
                <th>{t("help.actionColumn")}</th>
              </tr>
            </thead>
            <tbody>
              {shortcuts.map((shortcut, index) => (
                <tr key={index}>
                  <td className="key-cell">
                    <kbd>{shortcut.key}</kbd>
                  </td>
                  <td className="description-cell">{shortcut.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Help;
