import React from "react";
import packageJson from "../../package.json";
import { useTranslation } from "../i18n/useTranslation";

interface AboutInfoProps {
  onClose: () => void;
}

const AboutInfo: React.FC<AboutInfoProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const appName = "Lightning Timer";
  const appVersion = packageJson.version;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content about-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t("about.title")}</h2>
          <button className="modal-close-button" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body about-body">
          <div className="about-icon-container">
            <img
              src="/icon/lightning-timer.png"
              alt="Lightning Timer"
              className="about-icon"
            />
          </div>
          <div className="about-info">
            <h3 className="about-app-name">{appName}</h3>
            <p className="about-version">{t("about.version")} {appVersion}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutInfo;
