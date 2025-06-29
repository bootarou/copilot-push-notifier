# Change Log

All notable changes to the "Copilot Push Notifier" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-06-29

### Added
- 🎉 **Initial public release**
- 🔔 GitHub Copilot suggestion notifications
- 🪟 **Windows native toast notifications** with system sound
- 🔧 **Multi-tier fallback notification system**:
  - node-notifier (Primary)
  - WindowsToaster
  - PowerShell Balloon notifications
  - Windows Toast XML API
  - WScript.Shell popups
  - msg.exe command
  - Webview notifications (Final fallback)
- 🤖 **Copilot work session monitoring**:
  - Session start/end detection
  - Continuation prompt detection ("反復処理を続行しますか?")
  - Work interruption alerts
  - Configurable session timeout
- 🔇 **Silent mode** - Complete VS Code message suppression
- 📊 **Status bar integration** with suggestion counter
- ⚙️ **Comprehensive configuration options**
- 🧪 **Test notification commands** for each method

### Commands
- `Toggle Notifications` - Enable/disable all notifications
- `Test Notification` - Send comprehensive test notification
- `Toggle Notification Sound` - Audio on/off
- `Toggle Windows Native Notifications` - Switch between Windows/Webview
- `Toggle VS Code Internal Notifications` - Control VS Code messages
- `Toggle Silent Mode` - Disable ALL VS Code messages
- Individual test commands for each notification method

### Configuration Options
- `enabled` - Master notification toggle (default: true)
- `useSound` - Audio notifications (default: true)  
- `useWindowsNotifications` - Native Windows notifications (default: true)
- `disableVSCodeNotifications` - Disable VS Code notifications (default: true)
- `disableAllVSCodeMessages` - Silent mode (default: false)
- `monitorCopilotSession` - Session monitoring (default: true)
- `sessionTimeoutSeconds` - Session timeout in seconds (default: 30)
- `minimumSuggestionLength` - Minimum chars to trigger (default: 10)
- `notificationType` - Notification type: info/warning/error (default: warning)

### Technical Features
- TypeScript implementation with full type safety
- Robust error handling and fallback mechanisms
- Cross-Windows version compatibility
- Memory-efficient session tracking
- Automatic cleanup and disposal management
- No external permissions required (no web notifications)