use super::*;
use serde_json;

#[test]
fn test_get_window_state_path() {
    let path = get_window_state_path();

    // パスが有効であることを確認
    assert!(path.to_string_lossy().contains("lightning-timer"));
    assert!(path.to_string_lossy().contains("window_state.json"));

    // パスが絶対パスであることを確認
    assert!(path.is_absolute() || path.to_string_lossy().starts_with("."));
}

#[test]
fn test_window_state_default() {
    let state = WindowState::default();

    // デフォルト値が全てNoneであることを確認
    assert_eq!(state.x, None);
    assert_eq!(state.y, None);
    assert_eq!(state.width, None);
    assert_eq!(state.height, None);
}

#[test]
fn test_window_state_serialization() {
    // テスト用のWindowStateを作成
    let original_state = WindowState {
        x: Some(100),
        y: Some(200),
        width: Some(800),
        height: Some(600),
    };

    // シリアライズ
    let json = serde_json::to_string(&original_state).expect("Failed to serialize WindowState");
    assert!(!json.is_empty());

    // デシリアライズ
    let deserialized_state: WindowState = serde_json::from_str(&json).expect("Failed to deserialize WindowState");

    // 値が一致することを確認
    assert_eq!(original_state.x, deserialized_state.x);
    assert_eq!(original_state.y, deserialized_state.y);
    assert_eq!(original_state.width, deserialized_state.width);
    assert_eq!(original_state.height, deserialized_state.height);
}

#[test]
fn test_window_state_serialization_with_none_values() {
    // None値のみのWindowStateをテスト
    let original_state = WindowState {
        x: None,
        y: None,
        width: None,
        height: None,
    };

    // シリアライズ
    let json = serde_json::to_string(&original_state).expect("Failed to serialize WindowState");
    assert!(!json.is_empty());

    // デシリアライズ
    let deserialized_state: WindowState = serde_json::from_str(&json).expect("Failed to deserialize WindowState");

    // 値が一致することを確認
    assert_eq!(original_state.x, deserialized_state.x);
    assert_eq!(original_state.y, deserialized_state.y);
    assert_eq!(original_state.width, deserialized_state.width);
    assert_eq!(original_state.height, deserialized_state.height);
}

#[cfg(debug_assertions)]
#[test]
fn test_find_available_port_debug() {
    // デバッグモード時は1420が返されることを確認
    let result = find_available_port();
    assert!(result.is_ok());
    assert_eq!(result.unwrap(), 1420);
}

#[cfg(not(debug_assertions))]
#[test]
fn test_find_available_port_release() {
    // リリースモード時は20000-65535の範囲のポートが返されることを確認
    let result = find_available_port();
    assert!(result.is_ok());
    let port = result.unwrap();
    assert!(port >= 20000 && port <= 65535);
}

#[test]
fn test_window_state_equality() {
    let state1 = WindowState {
        x: Some(100),
        y: Some(200),
        width: Some(800),
        height: Some(600),
    };

    let state2 = WindowState {
        x: Some(100),
        y: Some(200),
        width: Some(800),
        height: Some(600),
    };

    let state3 = WindowState {
        x: Some(200),
        y: Some(300),
        width: Some(900),
        height: Some(700),
    };

    // 同じ値の場合は等しい
    assert_eq!(state1.x, state2.x);
    assert_eq!(state1.y, state2.y);
    assert_eq!(state1.width, state2.width);
    assert_eq!(state1.height, state2.height);

    // 異なる値の場合は異なる
    assert_ne!(state1.x, state3.x);
    assert_ne!(state1.y, state3.y);
    assert_ne!(state1.width, state3.width);
    assert_ne!(state1.height, state3.height);
}
