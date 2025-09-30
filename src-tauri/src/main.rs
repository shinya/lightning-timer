// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{AppHandle, Manager, Emitter, WindowEvent};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone)]
struct NumberInputEvent {
    number: String,
}

#[tauri::command]
async fn open_numberpad(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("numberpad") {
        // ウィンドウが既に存在する場合は表示する
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
    } else {
        // ウィンドウが存在しない場合は新しく作成
        let numberpad_window = tauri::WebviewWindowBuilder::new(
            &app,
            "numberpad",
            tauri::WebviewUrl::App("numberpad.html".into())
        )
        .title("Number Pad")
        .inner_size(300.0, 400.0)
        .resizable(false)
        .always_on_top(true)
        .visible(false)
        .build()
        .map_err(|e| e.to_string())?;

        numberpad_window.show().map_err(|e| e.to_string())?;
        numberpad_window.set_focus().map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
async fn close_numberpad(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("numberpad") {
        window.hide().map_err(|e| e.to_string())?;
    }
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
async fn send_number_input(app: AppHandle, number: String) -> Result<(), String> {
    println!("DEBUG: Received number input: {}", number);
    // メインウィンドウにイベントを送信
    if let Some(main_window) = app.get_webview_window("main") {
        println!("DEBUG: Sending event to main window");
        main_window.emit("number-input", NumberInputEvent { number }).map_err(|e| {
            println!("DEBUG: Failed to emit event: {}", e);
            e.to_string()
        })?;
        println!("DEBUG: Event sent successfully");
    } else {
        println!("DEBUG: Main window not found");
        return Err("Main window not found".to_string());
    }
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![open_numberpad, close_numberpad, send_number_input, open_devtools])
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
