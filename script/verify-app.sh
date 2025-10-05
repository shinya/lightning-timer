#!/bin/bash

# Lightning Timer アプリケーション確認スクリプト
# ユニバーサルビルドと公証化の確認のみを行います

set -e  # エラーが発生したら即座に終了

# スクリプトのディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# プロジェクトルートに移動（scriptディレクトリから1つ上）
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# アプリケーションパス
APP_PATH="src-tauri/target/universal-apple-darwin/release/bundle/macos/Lightning Timer.app"

echo "Lightning Timer アプリケーション確認を開始します..."
echo "対象: $APP_PATH"
echo ""

# アプリケーションの存在確認
if [ ! -d "$APP_PATH" ]; then
    echo "❌ アプリケーションが見つかりません: $APP_PATH"
    echo "   先にビルドを実行してください"
    exit 1
fi

echo "✅ アプリケーションが見つかりました"
echo ""

# 1. ユニバーサルビルドの確認
echo "🔍 ユニバーサルビルドの確認中..."
echo "   アーキテクチャ情報を取得中..."

# アプリケーションのアーキテクチャを確認
ARCH_INFO=$(file "$APP_PATH/Contents/MacOS/lightning-timer" 2>/dev/null || echo "ファイルが見つかりません")

echo "   実行ファイルのアーキテクチャ:"
echo "   $ARCH_INFO"

# ユニバーサルバイナリかどうか確認
if echo "$ARCH_INFO" | grep -q "universal binary"; then
    echo "✅ ユニバーサルバイナリが確認されました"

    # 詳細なアーキテクチャ情報を表示
    echo "   詳細なアーキテクチャ情報:"
    lipo -info "$APP_PATH/Contents/MacOS/lightning-timer" 2>/dev/null || echo "   lipoコマンドで詳細情報を取得できませんでした"
else
    echo "❌ ユニバーサルバイナリではありません"
    echo "   単一アーキテクチャの可能性があります"
fi

echo ""

# 2. 署名の確認
echo "🔐 署名の確認中..."
echo "   署名情報を取得中..."

# 署名の詳細情報を表示
SIGNATURE_INFO=$(codesign -dv --verbose=4 "$APP_PATH" 2>&1 || echo "署名情報の取得に失敗しました")
echo "   署名情報:"
echo "$SIGNATURE_INFO" | sed 's/^/   /'

# 署名が有効かどうか確認
if codesign --verify --deep --strict --verbose=2 "$APP_PATH" 2>/dev/null; then
    echo "✅ 署名が有効です"
else
    echo "❌ 署名が無効または見つかりません"
fi

echo ""

# 3. 公証化の確認
echo "🔍 公証化の確認中..."

# 公証化ステープルの確認
echo "   公証化ステープルを確認中..."
if xcrun stapler validate "$APP_PATH" 2>/dev/null; then
    echo "✅ 公証化ステープルが有効です"
else
    echo "❌ 公証化ステープルが見つからないか無効です"
fi

# 公証化の詳細情報を表示
echo "   公証化の詳細情報:"
STAPLE_INFO=$(xcrun stapler validate --verbose "$APP_PATH" 2>&1 || echo "公証化情報の取得に失敗しました")
echo "$STAPLE_INFO" | sed 's/^/   /'

echo ""

# 4. Gatekeeperの確認
echo "🛡️  Gatekeeperの確認中..."
echo "   セキュリティ評価を実行中..."

if spctl --assess --type execute --verbose "$APP_PATH" 2>/dev/null; then
    echo "✅ Gatekeeperを通過しています"
    echo "   アプリケーションは安全に実行できます"
else
    echo "❌ Gatekeeperを通過していません"
    echo "   セキュリティ警告が表示される可能性があります"
fi

echo ""

# 5. 総合評価
echo "📊 総合評価"
echo "================"

# ユニバーサルビルドの評価
if echo "$ARCH_INFO" | grep -q "universal binary"; then
    UNIVERSAL_STATUS="✅ ユニバーサルビルド"
else
    UNIVERSAL_STATUS="❌ ユニバーサルビルド"
fi

# 署名の評価
if codesign --verify --deep --strict --verbose=2 "$APP_PATH" 2>/dev/null; then
    SIGNATURE_STATUS="✅ 署名済み"
else
    SIGNATURE_STATUS="❌ 署名なし"
fi

# 公証化の評価
if xcrun stapler validate "$APP_PATH" 2>/dev/null; then
    NOTARIZATION_STATUS="✅ 公証化済み"
else
    NOTARIZATION_STATUS="❌ 公証化なし"
fi

# Gatekeeperの評価
if spctl --assess --type execute --verbose "$APP_PATH" 2>/dev/null; then
    GATEKEEPER_STATUS="✅ Gatekeeper通過"
else
    GATEKEEPER_STATUS="❌ Gatekeeper未通過"
fi

echo "   アーキテクチャ: $UNIVERSAL_STATUS"
echo "   署名: $SIGNATURE_STATUS"
echo "   公証化: $NOTARIZATION_STATUS"
echo "   セキュリティ: $GATEKEEPER_STATUS"

echo ""

# 配布準備の評価
if echo "$ARCH_INFO" | grep -q "universal binary" && \
   codesign --verify --deep --strict --verbose=2 "$APP_PATH" 2>/dev/null && \
   xcrun stapler validate "$APP_PATH" 2>/dev/null && \
   spctl --assess --type execute --verbose "$APP_PATH" 2>/dev/null; then
    echo "🎉 配布準備完了！"
    echo "   アプリケーションは配布可能な状態です"
    echo "   - ユニバーサルバイナリ（Intel + Apple Silicon対応）"
    echo "   - 署名済み"
    echo "   - 公証化済み"
    echo "   - Gatekeeper通過"
else
    echo "⚠️  配布準備未完了"
    echo "   上記の評価項目を確認してください"
fi

echo ""
echo "確認が完了しました"
