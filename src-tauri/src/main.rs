// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{AppHandle, Manager, WindowEvent};


#[tauri::command]
async fn open_devtools(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.open_devtools();
    }
    Ok(())
}


fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![open_devtools])
        .on_window_event(|_window, event| match event {
            WindowEvent::CloseRequested { .. } => {
                // メインウィンドウが閉じられた際にアプリケーション全体を終了
                std::process::exit(0);
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
