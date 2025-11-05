import React from "react";

interface HelpProps {
  onClose: () => void;
}

const Help: React.FC<HelpProps> = ({ onClose }) => {
  const shortcuts = [
    { key: "0-9", description: "Set timer time (left shift method)" },
    { key: "S", description: "Start/Pause timer" },
    { key: "Space", description: "Start/Pause timer" },
    { key: "Enter", description: "Start/Pause timer" },
    { key: "R", description: "Reset timer" },
    { key: "V", description: "Toggle compact mode" },
  ];

  return (
    <div className="help-overlay" onClick={onClose}>
      <div className="help" onClick={(e) => e.stopPropagation()}>
        <div className="help-header">
          <h3>Keyboard Shortcuts</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="help-content">
          <table className="shortcuts-table">
            <thead>
              <tr>
                <th>Key</th>
                <th>Action</th>
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
