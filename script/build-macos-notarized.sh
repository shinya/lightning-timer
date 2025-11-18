#!/bin/bash

# macOS公証化対応ビルド用シェルスクリプト
# Apple Developer Programのアカウントと証明書が必要です

set -e  # エラーが発生したら即座に終了

# スクリプトのディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# プロジェクトルートに移動（scriptディレクトリから1つ上）
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

echo "Lightning Timer macOS公証化対応ビルドを開始します..."

# 必要な環境変数のチェック
echo "必要な環境変数をチェック中..."

if [ -z "$APPLE_ID" ]; then
    echo "APPLE_ID環境変数が設定されていません"
    echo "export APPLE_ID=\"your-apple-id@example.com\""
    exit 1
fi

if [ -z "$APPLE_PASSWORD" ]; then
    echo "APPLE_PASSWORD環境変数が設定されていません"
    echo "export APPLE_PASSWORD=\"your-app-specific-password\""
    exit 1
fi

if [ -z "$APPLE_TEAM_ID" ]; then
    echo "APPLE_TEAM_ID環境変数が設定されていません"
    echo "export APPLE_TEAM_ID=\"YOUR_TEAM_ID\""
    exit 1
fi

# 証明書のチェック
echo "証明書をチェック中..."
if ! security find-identity -v -p codesigning | grep -q "Developer ID Application"; then
    echo "Developer ID Application証明書が見つかりません"
    echo "XcodeまたはApple Developer Portalで証明書をインストールしてください"
    exit 1
fi

# 証明書の詳細を取得
SIGNING_IDENTITY=$(security find-identity -v -p codesigning | grep "Developer ID Application" | head -1 | sed 's/.*"\(.*\)".*/\1/')
echo "使用する証明書: $SIGNING_IDENTITY"

# バックアップを作成
cp src-tauri/tauri.conf.json src-tauri/tauri.conf.json.backup

# 署名設定を更新
echo "設定ファイルを更新中..."
sed -i.tmp "s/\"signingIdentity\": \".*\"/\"signingIdentity\": \"$SIGNING_IDENTITY\"/" src-tauri/tauri.conf.json

# フロントエンドをビルド
echo "フロントエンドをビルド中..."
npm run build

# Rustアプリケーションをビルド（公証化対応）
echo "Rustアプリケーションをビルド中（公証化対応）..."
npm run tauri:build -- --target universal-apple-darwin

# 設定を元に戻す
echo "設定を元に戻しています..."
mv src-tauri/tauri.conf.json.backup src-tauri/tauri.conf.json
rm -f src-tauri/tauri.conf.json.tmp

# ビルド成果物の確認
APP_PATH="src-tauri/target/universal-apple-darwin/release/bundle/macos/Lightning Timer.app"
DMG_PATH="src-tauri/target/universal-apple-darwin/release/bundle/dmg/Lightning Timer_0.2.0_universal.dmg"

if [ ! -d "$APP_PATH" ]; then
    echo "アプリケーションファイルが見つかりません: $APP_PATH"
    exit 1
fi

if [ ! -f "$DMG_PATH" ]; then
    echo "DMGファイルが見つかりません: $DMG_PATH"
    exit 1
fi

echo "ビルド成果物が正常に生成されました"

# 公証化プロセス（Tauriで既に完了しているため、ステープルのみ実行）
echo "公証化プロセスを確認中..."

# 1. アプリケーションの署名確認
echo "アプリケーションの署名を確認中..."
codesign --verify --deep --strict --verbose=2 "$APP_PATH"

# 2. 公証化ステープルの確認
echo "公証化ステープルを確認中..."
xcrun stapler validate "$APP_PATH"

# 3. 最終確認
echo "最終確認中..."
spctl --assess --type execute --verbose "$APP_PATH"

echo "macOS公証化対応ビルドが完了しました！"
echo ""
echo "ビルド成果物:"
echo "  アプリケーション: $APP_PATH"
echo "  DMGファイル: $DMG_PATH"
echo "  ZIPファイル: $ZIP_PATH"
echo ""
echo "公証化が完了し、Gatekeeperを通過するアプリケーションが生成されました！"
