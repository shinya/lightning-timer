import type { Translations } from "./en";

const ja: Translations = {
  settings: {
    title: "設定",
    close: "閉じる (Esc)",
    window: {
      title: "ウィンドウ",
      alwaysOnTop: "常に最前面に表示",
      alwaysOnTopHint: "タイマーウィンドウを常に最前面に表示します",
      darkMode: "ダークモード",
      darkModeHint: "UIのテーマを切り替えます",
      showTimeUpWindow: '"Time Up" 画面を表示',
      showTimeUpWindowHint:
        'タイマー終了時に全画面の "Time Up" 画面を表示します',
    },
    alarm: {
      title: "アラーム",
      sound: "サウンド",
      testPlay: "試聴",
      testStop: "停止",
    },
    layer: {
      title: "レイヤーオーバーレイ",
      textColor: "文字色",
      textColorHint:
        "レイヤー表示の数字色を選びます。背景に合わせて調整できます。",
      shadow: "影",
      darkShadow: "暗い影",
      darkShadowHint: "明るい背景向け",
      lightShadow: "明るい影",
      lightShadowHint: "暗い背景向け",
      fontSize: "フォントサイズ",
      resetToDefault: "リセット",
      resetToDefaultTitle: "既定値に戻す",
      preview: "プレビュー",
    },
    language: {
      title: "言語",
      label: "表示言語",
      hint: "UIの言語を変更します（タイマー表示は常に英語です）",
      auto: "自動（OS言語に従う）",
      en: "English",
      ja: "日本語",
    },
  },
  help: {
    title: "キーボードショートカット",
    keyColumn: "キー",
    actionColumn: "操作",
    shortcuts: {
      numbers: "タイマー時間を設定（左シフト方式）",
      startPause: "タイマーの開始/一時停止",
      reset: "タイマーのリセット",
      toggleCompactMode: "表示モードの切り替え",
      toggleFullscreen: "フルスクリーンの切り替え",
      toggleLayer: "レイヤー表示の切り替え",
    },
  },
  about: {
    title: "アプリについて",
    version: "バージョン",
  },
  tooltips: {
    exitApp: "アプリケーションを終了",
    compactMode: "簡易表示モード",
    minimalMode: "ミニマム表示モード",
    normalMode: "通常表示に戻す",
    layerOn: "レイヤー表示を出す (L)",
    layerOff: "レイヤー表示を消す (L)",
    fullscreen: "フルスクリーン",
    windowMode: "ウィンドウモードに戻す",
    appInfo: "アプリ情報",
    setTimeFirst: "時間を設定してください",
    startTimer: "タイマーを開始",
  },
  timeup: {
    subtitle: "時間になりました。",
    instruction: "クリックまたは Esc キーで閉じる",
  },
} as const;

export default ja;
