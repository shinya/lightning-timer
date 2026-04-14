import React from "react";
import ReactDOM from "react-dom/client";
import { isTauri } from "@tauri-apps/api/core";
import { Store } from "@tauri-apps/plugin-store";
import { initLanguage } from "./i18n";
import App from "./App";
import "./index.css";

async function bootstrap() {
  let savedLanguage: string | undefined;
  if (isTauri()) {
    try {
      const store = await Store.load("settings.json");
      const saved = await store.get<{ language?: string }>("settings");
      savedLanguage = saved?.language;
    } catch {
      // Settings not yet saved; use default
    }
  }
  initLanguage(savedLanguage);

  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

bootstrap();
