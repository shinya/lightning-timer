// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager, Window};

#[tauri::command]
async fn open_numberpad(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_window("numberpad") {
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
    } else {
        return Err("Number pad window not found".to_string());
    }

    Ok(())
}

#[tauri::command]
async fn close_numberpad(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_window("numberpad") {
        window.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![open_numberpad, close_numberpad])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
