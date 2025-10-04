// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{AppHandle, Manager, WindowEvent};
use serde::{Deserialize, Serialize};
use std::fs;
#[cfg(not(debug_assertions))]
use std::net::{TcpListener, SocketAddr};
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

fn find_available_port() -> Result<u16, Box<dyn std::error::Error>> {
    // 開発時は1420番ポートを使用
    #[cfg(debug_assertions)]
    {
        println!("DEBUG: Development mode - using port 1420");
        return Ok(1420);
    }

    // 製品ビルド時は20000番台から順番に空いているポートを探す
    #[cfg(not(debug_assertions))]
    {
        for port in 20000..=65535 {
            let addr = SocketAddr::from(([127, 0, 0, 1], port));
            if let Ok(_listener) = TcpListener::bind(&addr) {
                println!("DEBUG: Found available port: {}", port);
                return Ok(port);
            }
        }
        Err("No available port found in range 20000-65535".into())
    }
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

#[tauri::command]
async fn set_window_size(app: AppHandle, width: u32, height: u32) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        // 現在のサイズを取得してデバッグ出力
        if let Ok(current_size) = window.inner_size() {
            println!("DEBUG: Current window size: {}x{}", current_size.width, current_size.height);
        }

        // スケールファクターを取得
        let scale_factor = window.scale_factor().unwrap_or(1.0);
        println!("DEBUG: Scale factor: {}", scale_factor);

        // 引数は論理サイズとして扱う
        let logical_width = width as f64;
        let logical_height = height as f64;

        println!("DEBUG: Setting logical size to {}x{} (scale factor: {})", logical_width, logical_height, scale_factor);

        // 論理サイズで設定
        if let Err(e) = window.set_size(tauri::Size::Logical(tauri::LogicalSize { width: logical_width, height: logical_height })) {
            println!("DEBUG: Failed to set logical size: {}", e);
            return Err(format!("Failed to set window size: {}", e));
        }

        // 少し待ってからサイズを確認
        std::thread::sleep(std::time::Duration::from_millis(100));

        // 変更後のサイズを確認
        if let Ok(new_size) = window.inner_size() {
            println!("DEBUG: New window size: {}x{}", new_size.width, new_size.height);
        }
    }
    Ok(())
}

#[tauri::command]
async fn set_window_resizable(app: AppHandle, resizable: bool) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        if let Err(e) = window.set_resizable(resizable) {
            println!("DEBUG: Failed to set window resizable: {}", e);
            return Err(format!("Failed to set window resizable: {}", e));
        }
        println!("DEBUG: Window resizable set to: {}", resizable);
    }
    Ok(())
}

#[tauri::command]
async fn focus_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        if let Err(e) = window.set_focus() {
            println!("DEBUG: Failed to focus window: {}", e);
            return Err(format!("Failed to focus window: {}", e));
        }
        println!("DEBUG: Window focused");
    }
    Ok(())
}

#[tauri::command]
async fn get_available_port() -> Result<u16, String> {
    match find_available_port() {
        Ok(port) => {
            println!("DEBUG: Available port found: {}", port);
            Ok(port)
        }
        Err(e) => {
            println!("DEBUG: Failed to find available port: {}", e);
            Err(format!("Failed to find available port: {}", e))
        }
    }
}

#[tauri::command]
async fn show_timeup_window(app: AppHandle) -> Result<(), String> {
    println!("DEBUG: show_timeup_window called");

    // 既存のウィンドウがあれば表示する、なければ新規作成
    if let Some(existing_window) = app.get_webview_window("timeup") {
        println!("DEBUG: Showing existing Time Up window");

        // ウィンドウ表示前にisClosingフラグをリセット
        let _ = existing_window.eval("
            console.log('Resetting isClosing flag...');
            if (typeof isClosing !== 'undefined') {
                isClosing = false;
                console.log('isClosing flag reset to false');
            } else {
                console.log('isClosing variable not found');
            }
        ");

        if let Err(e) = existing_window.show() {
            println!("DEBUG: Failed to show existing window: {}", e);
            return Err(format!("Failed to show existing Time Up window: {}", e));
        }
        if let Err(e) = existing_window.set_focus() {
            println!("DEBUG: Failed to focus existing window: {}", e);
            return Err(format!("Failed to focus existing Time Up window: {}", e));
        }
        println!("DEBUG: Existing Time Up window shown and focused");
        return Ok(());
    }

    // 新しいウィンドウを作成
    println!("DEBUG: Creating new Time Up window");

    // 画面サイズを取得（論理サイズを使用）
    let screen_size = if let Some(main_window) = app.get_webview_window("main") {
        if let Ok(monitor) = main_window.primary_monitor() {
            if let Some(monitor) = monitor {
                let size = monitor.size();
                let scale_factor = monitor.scale_factor();
                // 論理サイズを計算（物理サイズ / スケールファクター）
                let logical_width = size.width as f64 / scale_factor;
                let logical_height = size.height as f64 / scale_factor;
                println!("DEBUG: Physical size: {}x{}, Scale factor: {}, Logical size: {}x{}",
                        size.width, size.height, scale_factor, logical_width, logical_height);
                (logical_width, logical_height)
            } else {
                println!("DEBUG: No primary monitor found, using default size");
                (1920.0, 1080.0)
            }
        } else {
            println!("DEBUG: Failed to get primary monitor, using default size");
            (1920.0, 1080.0)
        }
    } else {
        println!("DEBUG: No main window found, using default size");
        (1920.0, 1080.0)
    };

    // 新しいTime Upウィンドウを作成（画面サイズに合わせて表示）
    match tauri::WebviewWindowBuilder::new(
        &app,
        "timeup",
        tauri::WebviewUrl::App("timeup.html".into())
    )
    .title("Time Up!!")
    .inner_size(screen_size.0, screen_size.1) // 画面サイズに合わせる
    .resizable(false)
    .decorations(false) // ウィンドウバー非表示
    .always_on_top(true)
    .visible(true) // 明示的に可視化
    .build() {
        Ok(_window) => {
            println!("DEBUG: Time Up window created with screen size");

            // ウィンドウを確実に表示
            if let Some(window) = app.get_webview_window("timeup") {
                if let Err(e) = window.show() {
                    println!("DEBUG: Failed to show window: {}", e);
                    return Err(format!("Failed to show Time Up window: {}", e));
                }
                if let Err(e) = window.set_focus() {
                    println!("DEBUG: Failed to focus window: {}", e);
                    return Err(format!("Failed to focus Time Up window: {}", e));
                }
                println!("DEBUG: Time Up window shown and focused");
            }
        }
        Err(e) => {
            println!("DEBUG: Failed to create Time Up window: {}", e);
            return Err(format!("Failed to create Time Up window: {}", e));
        }
    }

    Ok(())
}

#[tauri::command]
async fn hide_timeup_window(app: AppHandle) -> Result<(), String> {
    println!("DEBUG: hide_timeup_window command called");
    if let Some(window) = app.get_webview_window("timeup") {
        println!("DEBUG: Found timeup window, attempting to hide");
        // ウィンドウを閉じる代わりに非表示にする
        if window.label() == "timeup" {
            // ウィンドウを非表示にする
            window.hide().map_err(|e| {
                println!("DEBUG: Failed to hide window: {}", e);
                format!("Failed to hide Time Up window: {}", e)
            })?;
            println!("DEBUG: Time Up window hidden successfully");
        } else {
            println!("DEBUG: Window label mismatch, not hiding");
        }
    } else {
        println!("DEBUG: Time Up window not found");
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
               .invoke_handler(tauri::generate_handler![open_devtools, save_timer_state_on_exit, exit_app, start_drag, save_window_position, set_window_size, set_window_resizable, focus_window, get_available_port, show_timeup_window, hide_timeup_window])
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
