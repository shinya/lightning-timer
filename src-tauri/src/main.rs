// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::fs;
#[cfg(not(debug_assertions))]
use std::net::{SocketAddr, TcpListener};
use tauri::{AppHandle, Emitter, Manager, WindowEvent};
use tauri_plugin_store::Builder as StoreBuilder;

#[cfg(target_os = "macos")]
use objc2::MainThreadMarker;
#[cfg(target_os = "macos")]
use objc2_app_kit::NSApplication;

#[derive(Serialize, Deserialize, Default, Debug)]
pub struct WindowState {
    x: Option<i32>,
    y: Option<i32>,
    width: Option<u32>,
    height: Option<u32>,
}

pub fn get_window_state_path() -> std::path::PathBuf {
    let mut path = dirs::data_dir().unwrap_or_else(|| std::path::PathBuf::from("."));
    path.push("lightning-timer");
    fs::create_dir_all(&path).ok();
    path.push("window_state.json");
    path
}

pub fn find_available_port() -> Result<u16, Box<dyn std::error::Error>> {
    // 開発時は1420番ポートを使用
    #[cfg(debug_assertions)]
    {
        println!("DEBUG: Development mode - using port 1420");
        Ok(1420)
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
        width: None,  // サイズは固定なので保存しない
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

/// macOSでネイティブAPIを使ってウィンドウとWKWebViewにフォーカスを強制的に戻すヘルパー関数
fn force_focus_window(window: &tauri::WebviewWindow) {
    let _ = window.show();

    #[cfg(target_os = "macos")]
    {
        let _ = window.with_webview(|webview| unsafe {
            let mtm = MainThreadMarker::new_unchecked();
            let ns_app = NSApplication::sharedApplication(mtm);
            #[allow(deprecated)]
            ns_app.activateIgnoringOtherApps(true);

            let ns_window: &objc2_app_kit::NSWindow =
                &*(webview.ns_window() as *const objc2_app_kit::NSWindow);
            ns_window.makeKeyAndOrderFront(None);

            // WKWebViewをFirst Responderに設定してキーボードイベントを受け取れるようにする
            let wk_webview = webview.inner();
            let responder = &*(wk_webview as *const objc2_app_kit::NSResponder);
            ns_window.makeFirstResponder(Some(responder));
            println!("DEBUG: WKWebView set as first responder");
        });
        println!("DEBUG: macOS native force focus applied");
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = window.set_focus();
    }
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
            println!(
                "DEBUG: Current window size: {}x{}",
                current_size.width, current_size.height
            );
        }

        // スケールファクターを取得
        let scale_factor = window.scale_factor().unwrap_or(1.0);
        println!("DEBUG: Scale factor: {}", scale_factor);

        // 引数は論理サイズとして扱う
        let logical_width = width as f64;
        let logical_height = height as f64;

        println!(
            "DEBUG: Setting logical size to {}x{} (scale factor: {})",
            logical_width, logical_height, scale_factor
        );

        // 論理サイズで設定
        if let Err(e) = window.set_size(tauri::Size::Logical(tauri::LogicalSize {
            width: logical_width,
            height: logical_height,
        })) {
            println!("DEBUG: Failed to set logical size: {}", e);
            return Err(format!("Failed to set window size: {}", e));
        }

        // 少し待ってからサイズを確認
        std::thread::sleep(std::time::Duration::from_millis(100));

        // 変更後のサイズを確認
        if let Ok(new_size) = window.inner_size() {
            println!(
                "DEBUG: New window size: {}x{}",
                new_size.width, new_size.height
            );
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
        force_focus_window(&window);
        println!("DEBUG: Window force-focused");
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
        let _ = existing_window.eval(
            "
            console.log('Resetting isClosing flag...');
            if (typeof isClosing !== 'undefined') {
                isClosing = false;
                console.log('isClosing flag reset to false');
            } else {
                console.log('isClosing variable not found');
            }
        ",
        );

        // ウィンドウをプライマリモニターの左上角に移動
        if let Err(e) =
            existing_window.set_position(tauri::Position::Logical(tauri::LogicalPosition {
                x: 0.0,
                y: 0.0,
            }))
        {
            println!("DEBUG: Failed to set window position: {}", e);
        }

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

    // 画面サイズを取得（プライマリモニターの論理サイズを使用）
    let screen_size = if let Some(main_window) = app.get_webview_window("main") {
        if let Ok(monitor) = main_window.primary_monitor() {
            if let Some(monitor) = monitor {
                let size = monitor.size();
                let scale_factor = monitor.scale_factor();
                // 論理サイズを計算（物理サイズ / スケールファクター）
                let logical_width = size.width as f64 / scale_factor;
                let logical_height = size.height as f64 / scale_factor;
                println!(
                    "DEBUG: Physical size: {}x{}, Scale factor: {}, Logical size: {}x{}",
                    size.width, size.height, scale_factor, logical_width, logical_height
                );
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

    // 新しいTime Upウィンドウを作成（プライマリモニターの画面サイズに合わせて表示）
    match tauri::WebviewWindowBuilder::new(
        &app,
        "timeup",
        tauri::WebviewUrl::App("timeup.html".into()),
    )
    .title("Time Up!!")
    .inner_size(screen_size.0, screen_size.1) // プライマリモニターの画面サイズに合わせる
    .position(0.0, 0.0) // プライマリモニターの左上角に配置
    .resizable(false)
    .decorations(false) // ウィンドウバー非表示
    .always_on_top(true)
    .visible(true) // 明示的に可視化
    .build()
    {
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

/// macOSで透過オーバーレイウィンドウを他アプリのフルスクリーン Space 上にも表示するように設定する。
///
/// - `panel_nonactivating = true` : NSPanel へクラススワップして nonactivating にする
///   (layer 本体。クリックスルーで入力不要なので副作用なし。フルスクリーンアプリ上に出る)
/// - `panel_nonactivating = false` : NSWindow のまま level と collectionBehavior のみ設定
///   (layer_ctrl。NSPanel 化すると webview にクリックイベントが届かなくなるため。
///   他アプリのフルスクリーン Space には出ないが、クリック可能)
#[cfg(target_os = "macos")]
fn apply_macos_overlay_behavior(window: &tauri::WebviewWindow, panel_nonactivating: bool) {
    use objc2::msg_send;
    use objc2::runtime::AnyClass;

    let label = window.label().to_string();
    let _ = window.with_webview(move |webview| unsafe {
        let ns_window_ptr = webview.ns_window() as *mut objc2::runtime::AnyObject;
        if ns_window_ptr.is_null() {
            println!("DEBUG[{}]: ns_window pointer is null", label);
            return;
        }

        if panel_nonactivating {
            // NSWindow -> NSPanel へクラススワップ
            if let Some(panel_class) = AnyClass::get(c"NSPanel") {
                extern "C" {
                    fn object_setClass(
                        obj: *mut objc2::runtime::AnyObject,
                        cls: *const objc2::runtime::AnyClass,
                    ) -> *const objc2::runtime::AnyClass;
                }
                object_setClass(ns_window_ptr, panel_class);
                println!("DEBUG[{}]: NSWindow -> NSPanel class swap done", label);
            }

            // NonactivatingPanel スタイルマスク追加
            let current_mask: usize = msg_send![ns_window_ptr, styleMask];
            let new_mask = current_mask | (1usize << 7);
            let _: () = msg_send![ns_window_ptr, setStyleMask: new_mask];

            let _: () = msg_send![ns_window_ptr, setFloatingPanel: true];
            let _: () = msg_send![ns_window_ptr, setHidesOnDeactivate: false];
        }

        // CanJoinAllSpaces | Stationary | FullScreenAuxiliary
        let behavior: usize = (1 << 0) | (1 << 4) | (1 << 8);
        let _: () = msg_send![ns_window_ptr, setCollectionBehavior: behavior];

        let level: isize = 1000;
        let _: () = msg_send![ns_window_ptr, setLevel: level];

        let applied_level: isize = msg_send![ns_window_ptr, level];
        let applied_mask: usize = msg_send![ns_window_ptr, styleMask];
        let applied_behavior: usize = msg_send![ns_window_ptr, collectionBehavior];
        println!(
            "DEBUG[{}]: overlay applied (panel_nonactivating={}, level={}, styleMask=0x{:x}, collectionBehavior=0x{:x})",
            label, panel_nonactivating, applied_level, applied_mask, applied_behavior
        );
    });
}

/// レイヤーディスプレイウィンドウの既定位置とサイズ（論理ピクセル・グローバル座標）を計算する。
/// 複数モニター環境では main ウィンドウが乗っているモニターを優先する
fn layer_default_geometry(app: &AppHandle) -> (f64, f64, f64, f64) {
    let layer_width = 320.0;
    let layer_height = 120.0;
    if let Some(main) = app.get_webview_window("main") {
        let monitor = main
            .current_monitor()
            .ok()
            .flatten()
            .or_else(|| main.primary_monitor().ok().flatten());
        if let Some(monitor) = monitor {
            let pos = monitor.position();
            let size = monitor.size();
            let scale = monitor.scale_factor();
            let origin_x = pos.x as f64 / scale;
            let origin_y = pos.y as f64 / scale;
            let screen_w = size.width as f64 / scale;
            let x = origin_x + screen_w - layer_width - 40.0;
            let y = origin_y + 40.0;
            return (x, y, layer_width, layer_height);
        }
    }
    (1200.0, 40.0, layer_width, layer_height)
}

/// 操作ハンドルの位置を元にディスプレイウィンドウの位置を同期する
fn sync_layer_to_ctrl(app: &AppHandle) {
    let ctrl = match app.get_webview_window("layer_ctrl") {
        Some(w) => w,
        None => return,
    };
    let layer = match app.get_webview_window("layer") {
        Some(w) => w,
        None => return,
    };
    let ctrl_pos = match ctrl.outer_position() {
        Ok(p) => p,
        Err(_) => return,
    };
    let ctrl_size = match ctrl.outer_size() {
        Ok(s) => s,
        Err(_) => return,
    };
    let layer_size = match layer.outer_size() {
        Ok(s) => s,
        Err(_) => return,
    };
    // 操作ハンドルの直上にディスプレイを中心合わせで配置
    let gap_physical: i32 = 8;
    let new_x = ctrl_pos.x + (ctrl_size.width as i32) / 2 - (layer_size.width as i32) / 2;
    let new_y = ctrl_pos.y - (layer_size.height as i32) - gap_physical;
    let _ = layer.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
        x: new_x,
        y: new_y,
    }));
}

#[tauri::command]
async fn show_layer_window(app: AppHandle) -> Result<(), String> {
    println!("DEBUG: show_layer_window called");

    let (default_x, default_y, layer_w, layer_h) = layer_default_geometry(&app);
    let ctrl_w: f64 = 50.0;
    let ctrl_h: f64 = 28.0;
    let ctrl_gap: f64 = 8.0;
    let ctrl_x = default_x + (layer_w - ctrl_w) / 2.0;
    let ctrl_y = default_y + layer_h + ctrl_gap;

    // ディスプレイ用（透過・クリックスルー）
    let layer_window = if let Some(w) = app.get_webview_window("layer") {
        w.show()
            .map_err(|e| format!("Failed to show layer: {}", e))?;
        w
    } else {
        tauri::WebviewWindowBuilder::new(&app, "layer", tauri::WebviewUrl::App("layer.html".into()))
            .title("Lightning Timer Overlay")
            .inner_size(layer_w, layer_h)
            .position(default_x, default_y)
            .resizable(false)
            .decorations(false)
            .transparent(true)
            .shadow(false)
            .always_on_top(true)
            .skip_taskbar(true)
            .focused(false)
            .visible(true)
            .build()
            .map_err(|e| format!("Failed to create layer window: {}", e))?
    };

    // クリックスルー有効化
    if let Err(e) = layer_window.set_ignore_cursor_events(true) {
        println!("DEBUG: Failed to set ignore_cursor_events: {}", e);
    }

    #[cfg(target_os = "macos")]
    apply_macos_overlay_behavior(&layer_window, true);

    // 操作ハンドル（非クリックスルー・ドラッグ）
    let _ctrl_window = if let Some(w) = app.get_webview_window("layer_ctrl") {
        w.show()
            .map_err(|e| format!("Failed to show layer_ctrl: {}", e))?;
        w
    } else {
        tauri::WebviewWindowBuilder::new(
            &app,
            "layer_ctrl",
            tauri::WebviewUrl::App("layer_ctrl.html".into()),
        )
        .title("Lightning Timer Controls")
        .inner_size(ctrl_w, ctrl_h)
        .position(ctrl_x, ctrl_y)
        .resizable(true)
        .min_inner_size(ctrl_w, ctrl_h)
        .max_inner_size(ctrl_w, ctrl_h)
        .decorations(false)
        .transparent(true)
        .shadow(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .visible(true)
        .build()
        .map_err(|e| format!("Failed to create layer_ctrl window: {}", e))?
    };

    #[cfg(target_os = "macos")]
    apply_macos_overlay_behavior(&_ctrl_window, false);

    // 初期位置同期
    sync_layer_to_ctrl(&app);

    Ok(())
}

/// 16進カラー文字列のサニタイズ。妥当でなければ既定値を返す
fn sanitize_hex_color(color: &str) -> String {
    let trimmed = color.trim();
    if trimmed.starts_with('#')
        && (trimmed.len() == 4 || trimmed.len() == 7 || trimmed.len() == 9)
        && trimmed[1..].chars().all(|c| c.is_ascii_hexdigit())
    {
        trimmed.to_string()
    } else {
        "#00ff66".to_string()
    }
}

#[tauri::command]
async fn update_layer_timer(
    app: AppHandle,
    minutes: u32,
    seconds: u32,
    show_time_up: bool,
) -> Result<(), String> {
    if let Some(layer) = app.get_webview_window("layer") {
        // min/max で値を妥当な範囲に丸める
        let m = minutes.min(99);
        let s = seconds.min(99);
        let content = if show_time_up {
            "TIME UP".to_string()
        } else {
            format!("{:02}:{:02}", m, s)
        };
        let class_op = if show_time_up { "add" } else { "remove" };
        let script = format!(
            "(function(){{var el=document.getElementById('time');if(!el)return;el.textContent='{}';el.classList.{}('timeup');}})();",
            content, class_op
        );
        if let Err(e) = layer.eval(&script) {
            println!("DEBUG: Failed to eval layer timer: {}", e);
            return Err(format!("Failed to update layer timer: {}", e));
        }
    }
    Ok(())
}

#[tauri::command]
async fn update_layer_style(
    app: AppHandle,
    color: String,
    shadow: String,
    font_size: f64,
) -> Result<(), String> {
    let safe_color = sanitize_hex_color(&color);
    let shadow_value = if shadow == "light" {
        "0 0 8px rgba(255,255,255,0.95), 0 0 16px rgba(255,255,255,0.8), 0 2px 4px rgba(255,255,255,1)"
    } else {
        "0 0 8px rgba(0,0,0,0.9), 0 0 16px rgba(0,0,0,0.7), 0 2px 4px rgba(0,0,0,1)"
    };
    let safe_font_size = font_size.clamp(1.0, 20.0);

    if let Some(layer) = app.get_webview_window("layer") {
        let script = format!(
            "(function(){{var r=document.documentElement;r.style.setProperty('--layer-color','{}');r.style.setProperty('--layer-shadow','{}');r.style.setProperty('--layer-font-size','{}rem');console.log('[layer] style set via eval',r.style.getPropertyValue('--layer-color'),r.style.getPropertyValue('--layer-font-size'));}})();",
            safe_color, shadow_value, safe_font_size
        );
        if let Err(e) = layer.eval(&script) {
            println!("DEBUG: Failed to eval layer style: {}", e);
            return Err(format!("Failed to update layer style: {}", e));
        }
        println!(
            "DEBUG: Layer style updated color={} shadow={} fontSize={}rem",
            safe_color, shadow, safe_font_size
        );
    }
    Ok(())
}

#[tauri::command]
async fn hide_layer_window(app: AppHandle) -> Result<(), String> {
    println!("DEBUG: hide_layer_window called");
    if let Some(w) = app.get_webview_window("layer") {
        match w.hide() {
            Ok(()) => println!("DEBUG: layer window hidden"),
            Err(e) => println!("DEBUG: Failed to hide layer window: {}", e),
        }
    } else {
        println!("DEBUG: layer window not found");
    }
    if let Some(w) = app.get_webview_window("layer_ctrl") {
        match w.hide() {
            Ok(()) => println!("DEBUG: layer_ctrl window hidden"),
            Err(e) => println!("DEBUG: Failed to hide layer_ctrl window: {}", e),
        }
    } else {
        println!("DEBUG: layer_ctrl window not found");
    }
    Ok(())
}

/// layer_ctrl の × ボタンから呼ばれる。
/// 1 度の invoke で hide + main 通知までまとめて実行する。
/// (JS 側で invoke → emitTo の 2 段にすると layer_ctrl 自体が消えてから emit するため
/// イベントが失われていた)
#[tauri::command]
async fn exit_layer_mode(app: AppHandle) -> Result<(), String> {
    println!("DEBUG: exit_layer_mode called");
    // 先に main へ通知してから hide (順序が逆だと layer_ctrl のコンテキストが消える可能性がある)
    if let Err(e) = app.emit_to(
        tauri::EventTarget::webview_window("main"),
        "layer-exit-requested",
        (),
    ) {
        println!("DEBUG: Failed to emit layer-exit-requested: {}", e);
    }
    if let Some(w) = app.get_webview_window("layer") {
        if let Err(e) = w.hide() {
            println!("DEBUG: Failed to hide layer: {}", e);
        }
    }
    if let Some(w) = app.get_webview_window("layer_ctrl") {
        if let Err(e) = w.hide() {
            println!("DEBUG: Failed to hide layer_ctrl: {}", e);
        }
    }
    Ok(())
}

/// main ウィンドウが乗っているモニターの中心座標 (論理ピクセル) を計算する
fn center_on_main_monitor(app: &AppHandle, width: f64, height: f64) -> (f64, f64) {
    if let Some(main) = app.get_webview_window("main") {
        let monitor = main
            .current_monitor()
            .ok()
            .flatten()
            .or_else(|| main.primary_monitor().ok().flatten());
        if let Some(monitor) = monitor {
            let pos = monitor.position();
            let size = monitor.size();
            let scale = monitor.scale_factor();
            let origin_x = pos.x as f64 / scale;
            let origin_y = pos.y as f64 / scale;
            let screen_w = size.width as f64 / scale;
            let screen_h = size.height as f64 / scale;
            let x = origin_x + (screen_w - width) / 2.0;
            let y = origin_y + (screen_h - height) / 2.0;
            return (x, y);
        }
    }
    (200.0, 200.0)
}

#[tauri::command]
async fn show_settings_window(app: AppHandle) -> Result<(), String> {
    println!("DEBUG: show_settings_window called");
    let width = 540.0;
    let height = 640.0;

    if let Some(w) = app.get_webview_window("settings") {
        // 既存ウィンドウは現在のモニターに移動してから表示
        let (x, y) = center_on_main_monitor(&app, width, height);
        let _ = w.set_position(tauri::Position::Logical(tauri::LogicalPosition { x, y }));
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
        return Ok(());
    }

    let (x, y) = center_on_main_monitor(&app, width, height);

    let window = tauri::WebviewWindowBuilder::new(
        &app,
        "settings",
        tauri::WebviewUrl::App("settings.html".into()),
    )
    .title("Lightning Timer Settings")
    .inner_size(width, height)
    .min_inner_size(420.0, 480.0)
    .position(x, y)
    .resizable(true)
    .decorations(true)
    .always_on_top(false)
    .skip_taskbar(false)
    .visible(true)
    .build()
    .map_err(|e| format!("Failed to create settings window: {}", e))?;

    let _ = window.set_focus();
    Ok(())
}

#[tauri::command]
async fn hide_settings_window(app: AppHandle) -> Result<(), String> {
    println!("DEBUG: hide_settings_window called");
    if let Some(w) = app.get_webview_window("settings") {
        let _ = w.hide();
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
               .invoke_handler(tauri::generate_handler![open_devtools, save_timer_state_on_exit, exit_app, start_drag, save_window_position, set_window_size, set_window_resizable, focus_window, get_available_port, show_timeup_window, hide_timeup_window, show_layer_window, hide_layer_window, update_layer_style, update_layer_timer, exit_layer_mode, show_settings_window, hide_settings_window])
        .on_window_event(|window, event| {
            match event {
                WindowEvent::CloseRequested { api, .. } => {
                    // settings ウィンドウは破棄せず非表示にして使い回す
                    if window.label() == "settings" {
                        api.prevent_close();
                        let _ = window.hide();
                        return;
                    }
                    // main ウィンドウが閉じられた場合のみアプリ全体を終了
                    if window.label() != "main" {
                        return;
                    }
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
                WindowEvent::Moved(_) => {
                    // 操作ハンドルが動いたらディスプレイも追従させる
                    if window.label() == "layer_ctrl" {
                        sync_layer_to_ctrl(window.app_handle());
                    }
                }
                _ => {}
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests;
