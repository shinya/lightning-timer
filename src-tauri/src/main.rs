// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{AppHandle, Manager, WindowEvent};
use serde::{Deserialize, Serialize};
use std::fs;
use tauri_plugin_store::Builder as StoreBuilder;

#[derive(Serialize, Deserialize, Default, Debug)]
struct WindowState {
    x: Option<i32>,
    y: Option<i32>,
    width: Option<u32>,
    height: Option<u32>,
}

fn get_window_state_path() -> std::path::PathBuf {
    let mut path = dirs::data_dir().unwrap_or_else(|| std::path::PathBuf::from("."));
    path.push("lightning-timer");
    fs::create_dir_all(&path).ok();
    path.push("window_state.json");
    path
}

fn save_window_state(window: &tauri::WebviewWindow) -> Result<(), Box<dyn std::error::Error>> {
    let state = WindowState {
        x: window.outer_position().ok().map(|p| p.x),
        y: window.outer_position().ok().map(|p| p.y),
        width: None, // サイズは固定なので保存しない
        height: None, // サイズは固定なので保存しない
    };

    let json = serde_json::to_string_pretty(&state)?;
    fs::write(get_window_state_path(), json)?;
    println!("DEBUG: Window state saved: {:?}", state);
    Ok(())
}

fn restore_window_state(window: &tauri::WebviewWindow) -> Result<(), Box<dyn std::error::Error>> {
    let path = get_window_state_path();
    if !path.exists() {
        println!("DEBUG: No saved window state found");
        return Ok(());
    }

    let json = fs::read_to_string(&path)?;
    let state: WindowState = serde_json::from_str(&json)?;

    if let Some(x) = state.x {
        if let Some(y) = state.y {
            window.set_position(tauri::Position::Physical(tauri::PhysicalPosition { x, y }))?;
            println!("DEBUG: Window position restored: ({}, {})", x, y);
        }
    }

    // サイズは固定なので復元しない
    println!("DEBUG: Window size is fixed, not restoring");

    Ok(())
}

#[tauri::command]
async fn open_devtools(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.open_devtools();
    }
    Ok(())
}

#[tauri::command]
async fn save_timer_state_on_exit() -> Result<(), String> {
    println!("DEBUG: Save timer state on exit command called");
    Ok(())
}

#[tauri::command]
async fn exit_app(app: AppHandle) -> Result<(), String> {
    println!("DEBUG: Exit app command called");
    app.exit(0);
    Ok(())
}

#[tauri::command]
async fn start_drag(window: tauri::WebviewWindow) -> Result<(), String> {
    println!("DEBUG: Start drag command called");
    if let Err(e) = window.start_dragging() {
        println!("DEBUG: Failed to start dragging: {}", e);
        return Err(format!("Failed to start dragging: {}", e));
    }
    Ok(())
}

#[tauri::command]
async fn save_window_position(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        if let Err(e) = save_window_state(&window) {
            println!("DEBUG: Failed to save window position: {}", e);
            return Err(format!("Failed to save window position: {}", e));
        }
    }
    Ok(())
}


fn main() {
    tauri::Builder::default()
        .plugin(StoreBuilder::default().build())
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                // ウィンドウ状態を復元
                if let Err(e) = restore_window_state(&window) {
                    println!("DEBUG: Failed to restore window state: {}", e);
                }
                // ウィンドウはtauri.conf.jsonで自動的に表示されるため、手動でshow()は不要
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![open_devtools, save_timer_state_on_exit, exit_app, start_drag, save_window_position])
        .on_window_event(|window, event| match event {
            WindowEvent::CloseRequested { .. } => {
                // タイマー状態保存を促す
                if let Some(main_window) = window.app_handle().get_webview_window("main") {
                    let _ = main_window.eval("if (window.__TAURI__) { window.__TAURI__.core.invoke('save_timer_state_on_exit'); }");
                }

                // ウィンドウが閉じられる前に状態を保存
                if let Some(main_window) = window.app_handle().get_webview_window("main") {
                    if let Err(e) = save_window_state(&main_window) {
                        println!("DEBUG: Failed to save window state: {}", e);
                    }
                }
                // メインウィンドウが閉じられた際にアプリケーション全体を終了
                std::process::exit(0);
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
