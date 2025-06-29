# Copilot Push Notifier

GitHub Copilotの提案/選択肢が表示されたときにプッシュ通知を送信するVS Code拡張機能です。

## 機能

- 🔔 GitHub Copilotの提案が利用可能になったときに通知を表示
- 🪟 Windows ネイティブ トースト通知（システム音付き）
- 🤖 **NEW! Copilot作業状態監視**:
  - 継続プロンプト（"反復処理を続行しますか?"）の検出と通知
  - 作業中断・セッション終了の検出と通知
  - Copilotセッションの開始・終了を自動追跡
- 🔧 **多段階フォールバック通知システム**:
  - node-notifier (第1段階)
  - WindowsToaster (第2段階)  
  - PowerShell Balloon通知 (第3段階)
  - Windows Toast XML API (第4段階)
  - WScript.Shell ポップアップ (第5段階)
  - msg.exe コマンド (第6段階)
  - Webview通知 (最終フォールバック)
- 🌐 インタラクティブなWebview音響通知（フォールバック）
- 📊 ステータスバーで提案数をトラッキング
- ⚙️ 通知の有効/無効を簡単に切り替え
- 🎛️ 詳細な設定オプション
- 🧪 テスト通知機能
- 🔇 **サイレントモード** - 全てのVS Code内メッセージを無効化
- ⏰ ユーザーフレンドリーな自動閉じタイマー

## インストール

1. VS Codeで `F1` キーを押してコマンドパレットを開く
2. `Extensions: Install from VSIX...` を選択
3. この拡張機能のVSIXファイルを選択

## 使用方法

### 基本的な使用

1. 拡張機能をインストールすると、自動的に有効になります
2. コードを編集してGitHub Copilotの提案がトリガーされると通知が表示されます
3. ステータスバーのベルアイコンをクリックして通知のオン/オフを切り替えられます

### コマンド

- `Copilot Push Notifier: Toggle Notifications` - 通知の有効/無効を切り替え
- `Copilot Push Notifier: Test Notification` - テスト通知を送信
- `Copilot Push Notifier: Toggle Copilot Notification Sound` - 音響通知の有効/無効を切り替え
- `Copilot Push Notifier: Toggle Windows Native Notifications` - Windows/Webview通知の切り替え
- `Copilot Push Notifier: Test Windows Native Notification Only` - Windows通知のみテスト
- `Copilot Push Notifier: Test PowerShell Notification Only` - PowerShell通知のみテスト
- `Copilot Push Notifier: Test WScript Popup Only` - WScriptポップアップのみテスト
- `Copilot Push Notifier: Test msg.exe Command Only` - msg.exe通知のみテスト
- `Copilot Push Notifier: Toggle VS Code Internal Notifications` - VS Code内通知の有効/無効切り替え
- `Copilot Push Notifier: Toggle Silent Mode (Disable ALL VS Code Messages)` - **NEW!** サイレントモード切り替え

### 設定

VS Codeの設定で以下のオプションを調整できます：

- `copilotPushNotifier.enabled` - 通知の有効/無効 (デフォルト: true)
- `copilotPushNotifier.showInfoMessages` - 情報メッセージの表示 (デフォルト: true)
- `copilotPushNotifier.showWarningMessages` - 警告メッセージの表示 (デフォルト: false)
- `copilotPushNotifier.minimumSuggestionLength` - 通知をトリガーする最小提案文字数 (デフォルト: 10)
- `copilotPushNotifier.useSound` - 音響通知の有効/無効 (デフォルト: true)
- `copilotPushNotifier.useModalNotifications` - モーダル通知の使用 (デフォルト: false)
- `copilotPushNotifier.notificationType` - 通知の種類 (info/warning/error, デフォルト: warning)
- `copilotPushNotifier.useWindowsNotifications` - Windows ネイティブ通知の使用 (デフォルト: true)
- `copilotPushNotifier.disableVSCodeNotifications` - VS Code内通知の無効化 (デフォルト: true)
- `copilotPushNotifier.disableAllVSCodeMessages` - **NEW!** 全てのVS Codeメッセージの無効化 (デフォルト: false)
- `copilotPushNotifier.monitorCopilotSession` - **NEW!** Copilot作業セッション監視の有効/無効 (デフォルト: true)
- `copilotPushNotifier.sessionTimeoutSeconds` - **NEW!** セッション終了判定までの秒数 (デフォルト: 30)

### Copilot作業状態監視機能 🤖

この機能により、以下の状況で自動的に通知が送信されます：

#### 🚀 セッション開始
- 大量のテキスト変更（Copilot提案の受け入れ）を検出すると「Copilot session started!」通知

#### ⏳ 継続プロンプト検出  
- 高速入力後の停止を検出すると「Copilot may be showing continuation prompt - check VS Code!」通知
- 「反復処理を続行しますか?」メッセージの可能性を警告

#### ⚠️ 作業中断検出
- Copilotセッション中にエディターを変更すると「Work interrupted - editor changed during Copilot session」通知

#### ⏹️ セッション終了  
- 設定した時間（デフォルト30秒）非アクティブになると「Copilot session ended due to inactivity」通知

## 開発

### 前提条件

- Node.js 20.x以上
- VS Code 1.101.0以上

### セットアップ

```bash
npm install
npm run compile
```

### デバッグ

1. VS Codeでプロジェクトを開く
2. `F5`キーを押して拡張機能開発ホストを起動
3. 新しいVS Codeウィンドウで拡張機能をテスト

### ビルド

```bash
npm run compile
```

### テスト

```bash
npm run test
```

## トラブルシューティング

### 通知が表示されない

1. 拡張機能が有効になっているか確認
2. ステータスバーでベルアイコンが表示されているか確認
3. 設定で通知が有効になっているか確認
4. Windows通知が機能しない場合は `Toggle Windows Native Notifications` でWebview通知に切り替え

### VS Code内の通知が邪魔

1. `Toggle VS Code Internal Notifications` でVS Code内通知を無効化
2. 設定 `copilotPushNotifier.disableVSCodeNotifications` を `true` に設定
3. Windows通知のみが表示され、VS Code内通知は表示されなくなります

### 音が鳴らない

1. `Toggle Copilot Notification Sound` で音響を有効化
2. Windows通知を使用している場合、システムの通知音設定を確認
3. 各通知方法をテスト:
   - `Test PowerShell Notification Only` - PowerShell + システム音
   - `Test WScript Popup Only` - WScriptポップアップ + システム音
   - `Test msg.exe Command Only` - msg.exe + 別途システム音
4. Webview通知の場合、ブラウザの音響ポリシーによりクリックが必要な場合があります

### Windows通知が表示されない

1. `Test Windows Native Notification Only` で各方法を順番にテスト
2. 個別テストコマンドで動作する方法を確認:
   - PowerShell Balloon通知
   - Windows Toast XML API  
   - WScript.Shell ポップアップ
   - msg.exe コマンド
3. Windows通知設定 (`設定` → `システム` → `通知とアクション`) を確認
4. 最終手段として `Toggle Windows Native Notifications` でWebview通知に切り替え

### 通知ページが早く閉じる

- Webview通知は15秒後に自動で閉じます
- 音を再生すると3秒後に閉じます
- 右上の×ボタンで手動で閉じることができます

### GitHub Copilotが動作しない

1. GitHub Copilot拡張機能がインストールされているか確認
2. Copilotのライセンスが有効か確認
3. サポートされている言語で作業しているか確認

## ライセンス

MIT License

## 貢献

プルリクエストや問題報告を歓迎します！

## 変更履歴

### 0.0.1

- 初回リリース
- GitHub Copilot提案の基本的な監視機能
- 通知システムの実装
- 設定可能なオプション
