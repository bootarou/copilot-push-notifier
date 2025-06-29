// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as notifier from 'node-notifier';
import * as path from 'path';
import { exec } from 'child_process';

interface CopilotNotifierSettings {
	enabled: boolean;
	showInfoMessages: boolean;
	showWarningMessages: boolean;
	minimumSuggestionLength: number;
	useSound: boolean;
	useModalNotifications: boolean;
	notificationType: 'info' | 'warning' | 'error';
	useWindowsNotifications: boolean;
	disableVSCodeNotifications: boolean;
	disableAllVSCodeMessages: boolean;
	monitorCopilotSession: boolean;
	sessionTimeoutSeconds: number;
}

class CopilotMonitor implements vscode.Disposable {
	private statusBarItem: vscode.StatusBarItem;
	private suggestionCount: number = 0;
	private settings: CopilotNotifierSettings;
	
	// Copilot作業状態監視用
	private lastActivityTime: number = Date.now();
	private activityTimer: NodeJS.Timeout | undefined;
	private isInCopilotSession: boolean = false;
	private lastTextLength: number = 0;
	private rapidTypingTimer: NodeJS.Timeout | undefined;
	private readonly ACTIVITY_TIMEOUT = 30000; // 30秒の非アクティブでセッション終了と判定
	private readonly RAPID_TYPING_THRESHOLD = 1000; // 1秒以内の高速入力でCopilotセッション開始と判定

	constructor(private context: vscode.ExtensionContext) {
		this.settings = this.loadSettings();
		console.log('CopilotMonitor settings loaded:', this.settings);
		this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
		this.statusBarItem.text = "$(bell) Copilot Notifier";
		this.statusBarItem.command = 'copilot-push-notifier.toggleNotifications';
		this.statusBarItem.tooltip = "Click to toggle Copilot notifications";
		this.updateStatusBar();
		this.statusBarItem.show();
		console.log('CopilotMonitor: Status bar item created and shown');
	}

	private loadSettings(): CopilotNotifierSettings {
		const config = vscode.workspace.getConfiguration('copilotPushNotifier');
		return {
			enabled: config.get('enabled', true),
			showInfoMessages: config.get('showInfoMessages', true),
			showWarningMessages: config.get('showWarningMessages', false),
			minimumSuggestionLength: config.get('minimumSuggestionLength', 10),
			useSound: config.get('useSound', true),
			useModalNotifications: config.get('useModalNotifications', false),
			notificationType: config.get('notificationType', 'warning'),
			useWindowsNotifications: config.get('useWindowsNotifications', true),
			disableVSCodeNotifications: config.get('disableVSCodeNotifications', true),
			disableAllVSCodeMessages: config.get('disableAllVSCodeMessages', false),
			monitorCopilotSession: config.get('monitorCopilotSession', true),
			sessionTimeoutSeconds: config.get('sessionTimeoutSeconds', 30)
		};
	}

	private showVSCodeMessage(type: 'info' | 'warning' | 'error', message: string, ...items: string[]) {
		if (this.settings.disableAllVSCodeMessages) {
			console.log(`VS Code message suppressed (silent mode): ${message}`);
			return Promise.resolve(undefined);
		}

		switch (type) {
			case 'info':
				return vscode.window.showInformationMessage(message, ...items);
			case 'warning':
				return vscode.window.showWarningMessage(message, ...items);
			case 'error':
				return vscode.window.showErrorMessage(message, ...items);
		}
	}

	private showVSCodeModalMessage(type: 'info' | 'warning' | 'error', message: string, options: any, ...items: string[]) {
		if (this.settings.disableAllVSCodeMessages) {
			console.log(`VS Code modal message suppressed (silent mode): ${message}`);
			return Promise.resolve(undefined);
		}

		switch (type) {
			case 'info':
				return vscode.window.showInformationMessage(message, options, ...items);
			case 'warning':
				return vscode.window.showWarningMessage(message, options, ...items);
			case 'error':
				return vscode.window.showErrorMessage(message, options, ...items);
		}
	}

	private updateStatusBar() {
		const status = this.settings.enabled ? "$(bell)" : "$(bell-slash)";
		this.statusBarItem.text = `${status} Copilot Notifier (${this.suggestionCount})`;
		this.statusBarItem.tooltip = this.settings.enabled 
			? `Copilot notifications enabled. Suggestions detected: ${this.suggestionCount}`
			: `Copilot notifications disabled. Click to enable.`;
	}

	public toggleNotifications() {
		this.settings.enabled = !this.settings.enabled;
		const config = vscode.workspace.getConfiguration('copilotPushNotifier');
		config.update('enabled', this.settings.enabled, vscode.ConfigurationTarget.Global);
		this.updateStatusBar();
		
		const message = this.settings.enabled 
			? "Copilot notifications enabled!" 
			: "Copilot notifications disabled!";
		this.showVSCodeMessage('info', message);
	}

	public toggleSound() {
		this.settings.useSound = !this.settings.useSound;
		const config = vscode.workspace.getConfiguration('copilotPushNotifier');
		config.update('useSound', this.settings.useSound, vscode.ConfigurationTarget.Global);
		
		const message = this.settings.useSound 
			? "🔊 Copilot notification sound enabled!" 
			: "🔇 Copilot notification sound disabled!";
		
		console.log(`Sound toggled: ${this.settings.useSound}`);
		this.showVSCodeMessage('info', message);
		
		if (this.settings.useSound) {
			// Test the sound immediately
			console.log('Testing sound after toggle...');
			this.playNotificationSound();
		}
	}

	public toggleWindowsNotifications() {
		this.settings.useWindowsNotifications = !this.settings.useWindowsNotifications;
		const config = vscode.workspace.getConfiguration('copilotPushNotifier');
		config.update('useWindowsNotifications', this.settings.useWindowsNotifications, vscode.ConfigurationTarget.Global);
		
		const message = this.settings.useWindowsNotifications 
			? "🪟 Windows native notifications enabled!" 
			: "🌐 Webview notifications enabled!";
		
		console.log(`Windows notifications toggled: ${this.settings.useWindowsNotifications}`);
		this.showVSCodeMessage('info', message);
		
		// 設定変更の通知のみ、テスト通知は削除
		console.log('Notification method changed. Use "Test Copilot Notification" to test.');
	}

	public toggleVSCodeNotifications() {
		this.settings.disableVSCodeNotifications = !this.settings.disableVSCodeNotifications;
		const config = vscode.workspace.getConfiguration('copilotPushNotifier');
		config.update('disableVSCodeNotifications', this.settings.disableVSCodeNotifications, vscode.ConfigurationTarget.Global);
		
		const message = this.settings.disableVSCodeNotifications 
			? "🚫 VS Code internal notifications disabled!" 
			: "📢 VS Code internal notifications enabled!";
		
		console.log(`VS Code notifications disabled: ${this.settings.disableVSCodeNotifications}`);
		this.showVSCodeMessage('info', message);
	}

	public toggleSilentMode() {
		this.settings.disableAllVSCodeMessages = !this.settings.disableAllVSCodeMessages;
		const config = vscode.workspace.getConfiguration('copilotPushNotifier');
		config.update('disableAllVSCodeMessages', this.settings.disableAllVSCodeMessages, vscode.ConfigurationTarget.Global);
		
		const message = this.settings.disableAllVSCodeMessages 
			? "🔇 Silent mode enabled! All VS Code messages disabled." 
			: "🔊 Silent mode disabled! VS Code messages re-enabled.";
		
		console.log(`Silent mode: ${this.settings.disableAllVSCodeMessages}`);
		
		// Only show this message if we're turning OFF silent mode
		if (!this.settings.disableAllVSCodeMessages) {
			vscode.window.showInformationMessage(message);
		}
	}

	// Copilot作業状態監視メソッド
	public onTextActivity(document: vscode.TextDocument, changes: readonly vscode.TextDocumentContentChangeEvent[]) {
		if (!this.settings.enabled || !this.settings.monitorCopilotSession) return;

		this.lastActivityTime = Date.now();
		const currentTextLength = document.getText().length;
		const lengthDelta = Math.abs(currentTextLength - this.lastTextLength);
		this.lastTextLength = currentTextLength;

		// 急激なテキスト変更（Copilot提案の受け入れ）を検出
		if (lengthDelta > 20) {
			this.startCopilotSession();
		}

		// アクティビティタイマーをリセット
		this.resetActivityTimer();

		// 高速入力検出
		if (this.rapidTypingTimer) {
			clearTimeout(this.rapidTypingTimer);
		}
		
		this.rapidTypingTimer = setTimeout(() => {
			// 高速入力が止まった場合、継続プロンプトの可能性を検討
			this.checkForContinuationPrompt();
		}, this.RAPID_TYPING_THRESHOLD);
	}

	private startCopilotSession() {
		if (!this.isInCopilotSession) {
			this.isInCopilotSession = true;
			console.log('🤖 Copilot session started');
			this.notifyCopilotSessionChange('🚀 Copilot session started!');
		}
	}

	private endCopilotSession() {
		if (this.isInCopilotSession) {
			this.isInCopilotSession = false;
			console.log('🤖 Copilot session ended');
			this.notifyCopilotSessionChange('⏹️ Copilot session ended due to inactivity');
		}
	}

	private checkForContinuationPrompt() {
		if (this.isInCopilotSession) {
			// 継続プロンプトの可能性を通知
			console.log('🤖 Possible Copilot continuation prompt detected');
			this.notifyCopilotSessionChange('⏳ Copilot may be showing continuation prompt - check VS Code!');
		}
	}

	private resetActivityTimer() {
		if (this.activityTimer) {
			clearTimeout(this.activityTimer);
		}
		
		const timeoutMs = this.settings.sessionTimeoutSeconds * 1000;
		this.activityTimer = setTimeout(() => {
			this.endCopilotSession();
		}, timeoutMs);
	}

	public onEditorChange(editor: vscode.TextEditor) {
		if (!this.settings.enabled || !this.settings.monitorCopilotSession) return;

		// エディターが変更された場合、作業の中断として判定
		if (this.isInCopilotSession) {
			console.log('🤖 Editor changed during Copilot session - potential interruption');
			this.notifyCopilotSessionChange('⚠️ Work interrupted - editor changed during Copilot session');
		}

		// 新しいエディターでの作業開始
		this.lastTextLength = editor.document.getText().length;
		this.resetActivityTimer();
	}

	private notifyCopilotSessionChange(message: string) {
		// Windows通知で状態変化を通知
		if (this.settings.useWindowsNotifications) {
			this.showCustomWindowsNotification(message, 'Copilot Status Change');
		}

		// 音も鳴らす
		if (this.settings.useSound) {
			this.playNotificationSound();
		}

		// ステータスバーの更新
		this.flashStatusBar();
	}

	private showCustomWindowsNotification(message: string, title: string) {
		try {
			notifier.notify({
				title: title,
				message: message,
				icon: path.join(__dirname, '..', 'media', 'copilot-icon.png'),
				sound: this.settings.useSound,
				wait: false,
				timeout: 8
			}, (err, response) => {
				if (err) {
					console.error('Windows notification error:', err);
					// フォールバック通知
					this.showPowerShellNotification(message, title);
				}
			});
		} catch (error) {
			console.error('Failed to show Windows notification:', error);
			this.showPowerShellNotification(message, title);
		}
	}

	private showPowerShellNotification(message: string, title: string) {
		const psCommand = `
			Add-Type -AssemblyName System.Windows.Forms
			[System.Windows.Forms.MessageBox]::Show('${message}', '${title}', 'OK', 'Information')
		`;
		
		exec(`powershell -Command "${psCommand}"`, (error) => {
			if (error) {
				console.error('PowerShell notification failed:', error);
			}
		});
	}

	public onCopilotSuggestion(suggestion: string) {
		if (!this.settings.enabled || suggestion.length < this.settings.minimumSuggestionLength) {
			return;
		}

		this.suggestionCount++;
		this.updateStatusBar();

		// Play notification sound if enabled
		if (this.settings.useSound) {
			this.playNotificationSound();
		}

		// Skip VS Code notifications if Windows notifications are enabled and VS Code notifications are disabled
		if (this.settings.useWindowsNotifications && this.settings.disableVSCodeNotifications) {
			console.log('🪟 Windows notifications enabled, skipping VS Code notifications');
			// Only flash the status bar for visual feedback
			this.flashStatusBar();
			return;
		}

		const truncatedSuggestion = suggestion.length > 50 
			? suggestion.substring(0, 47) + "..." 
			: suggestion;
		
		const message = `🤖 Copilot suggestion available: "${truncatedSuggestion}"`;
		const actions = ['View', 'Dismiss', 'Settings'];

		// Choose notification type based on settings
		switch (this.settings.notificationType) {
			case 'warning':
				if (this.settings.useModalNotifications) {
					this.showVSCodeModalMessage('warning', message, { modal: true, detail: "Click 'View' to see the full suggestion." }, ...actions)
						?.then(this.handleNotificationAction.bind(this));
				} else {
					this.showVSCodeMessage('warning', message, ...actions)
						?.then(this.handleNotificationAction.bind(this));
				}
				break;
			case 'error':
				this.showVSCodeMessage('error', message, ...actions)
					?.then(this.handleNotificationAction.bind(this));
				break;
			default:
				if (this.settings.showInfoMessages) {
					this.showVSCodeMessage('info', message, ...actions)
						?.then(this.handleNotificationAction.bind(this));
				}
				break;
		}

		// Additional visual feedback - flash the status bar
		this.flashStatusBar();
	}

	public playNotificationSound() {
		try {
			console.log('🔊 Playing notification...');
			
			// Use Windows native notification if enabled (recommended)
			if (this.settings.useWindowsNotifications) {
				this.showWindowsNotification();
			} else {
				// Fallback to webview sound
				this.createSoundWebview();
			}
			
		} catch (error) {
			console.error('❌ Error in playNotificationSound:', error);
			// Last resort fallback
			this.createSoundWebview();
		}
	}

	public showWindowsNotification() {
		console.log('🪟 Creating Windows toast notification...');
		console.log('Platform:', process.platform);
		console.log('Node-notifier available:', !!notifier);
		
		// Check if we're on Windows
		if (process.platform !== 'win32') {
			console.log('Not on Windows platform, falling back to webview');
			this.createSoundWebview();
			return;
		}
		
		try {
			// Try the simpler notify first
			console.log('Attempting basic notification...');
			notifier.notify({
				title: '🤖 GitHub Copilot',
				message: 'New suggestion available! Click to view.',
				sound: true, // This should trigger system sound
				wait: false
			}, (err, response, metadata) => {
				if (err) {
					console.error('❌ Basic notification failed:', err);
					console.log('Trying WindowsToaster...');
					this.tryWindowsToaster();
				} else {
					console.log('✅ Basic Windows notification sent successfully');
					console.log('Response:', response);
					if (metadata) console.log('Metadata:', metadata);
					
					// Handle user actions
					if (response === 'activate') {
						console.log('User activated Windows notification');
						vscode.commands.executeCommand('editor.action.inlineSuggest.trigger');
					}
				}
			});
			
		} catch (error) {
			console.error('❌ Exception in showWindowsNotification:', error);
			console.log('Trying WindowsToaster fallback...');
			this.tryWindowsToaster();
		}
	}

	private tryWindowsToaster() {
		try {
			console.log('🪟 Trying WindowsToaster...');
			
			// Force Windows 10 Toast notification
			const WindowsToaster = notifier.WindowsToaster;
			if (!WindowsToaster) {
				console.error('WindowsToaster not available');
				this.createSoundWebview();
				return;
			}
			
			const toaster = new WindowsToaster({
				withFallback: false // Don't fallback to balloon
			});
			
			toaster.notify({
				title: '🤖 GitHub Copilot',
				message: 'New suggestion available! Click to view.',
				sound: 'Notification.Default', // Explicit Windows sound
				wait: false,
				appID: 'Microsoft.VSCode', // Use VS Code's app ID
				remove: undefined
			}, (err, response, metadata) => {
				if (err) {
					console.error('❌ WindowsToaster failed:', err);
					console.log('Trying PowerShell notification as last resort...');
					this.tryPowerShellNotification();
				} else {
					console.log('✅ WindowsToaster notification sent successfully');
					console.log('Response:', response);
					if (metadata) console.log('Metadata:', metadata);
					
					// Handle user actions
					if (response === 'activate') {
						console.log('User activated Windows notification');
						vscode.commands.executeCommand('editor.action.inlineSuggest.trigger');
					}
				}
			});
			
		} catch (error) {
			console.error('❌ WindowsToaster exception:', error);
			console.log('Trying PowerShell notification as last resort...');
			this.tryPowerShellNotification();
		}
	}

	public tryPowerShellNotification() {
		console.log('🔧 Trying PowerShell notification...');
		
		try {
			// First try the simpler balloon notification
			const powershellScript = `
Add-Type -AssemblyName System.Windows.Forms
$global:balloon = New-Object System.Windows.Forms.NotifyIcon
$path = (Get-Process -id $pid).Path
$balloon.Icon = [System.Drawing.Icon]::ExtractAssociatedIcon($path)
$balloon.BalloonTipIcon = [System.Windows.Forms.ToolTipIcon]::Info
$balloon.BalloonTipText = 'New suggestion available! Click to view.'
$balloon.BalloonTipTitle = '🤖 GitHub Copilot'
$balloon.Visible = $true
$balloon.ShowBalloonTip(5000)

# Play system sound
[System.Media.SystemSounds]::Notification.Play()

Start-Sleep -Seconds 2
$balloon.Dispose()
			`.trim();
			
			const command = `powershell -Command "${powershellScript.replace(/"/g, '\\"')}"`;
			
			exec(command, (error: any, stdout: any, stderr: any) => {
				if (error) {
					console.error('❌ PowerShell balloon notification failed:', error);
					console.log('Trying Windows Toast XML...');
					this.tryWindowsToastXML();
				} else {
					console.log('✅ PowerShell balloon notification sent successfully');
					if (stdout) console.log('PowerShell stdout:', stdout);
					if (stderr) console.log('PowerShell stderr:', stderr);
				}
			});
			
		} catch (error) {
			console.error('❌ PowerShell notification exception:', error);
			console.log('Trying Windows Toast XML...');
			this.tryWindowsToastXML();
		}
	}

	private createSoundWebview() {
		console.log('🌐 Creating interactive sound webview...');
		
		const panel = vscode.window.createWebviewPanel(
			'copilotSound',
			'🔊 Copilot Sound - Click to Play!',
			{ viewColumn: vscode.ViewColumn.Beside, preserveFocus: false },
			{
				enableScripts: true,
				retainContextWhenHidden: false
			}
		);

		panel.webview.onDidReceiveMessage(
			message => {
				console.log('📨 Webview message:', message);
				switch (message.type) {
					case 'soundPlayed':
						console.log('🔊 Sound played successfully!');
						// Auto-close after sound is played (user-friendly)
						setTimeout(() => {
							panel.dispose();
						}, 3000); // Close 3 seconds after sound plays
						break;
					case 'userClicked':
						console.log('👆 User clicked to play sound');
						break;
					case 'error':
						console.log('❌ Webview error:', message.data);
						break;
					case 'closePanel':
						console.log('🚪 User requested to close panel');
						panel.dispose();
						break;
				}
			},
			undefined,
			this.context.subscriptions
		);

		panel.webview.html = this.getSoundWebviewContent();

		// Auto-close after 15 seconds (longer time for user to interact)
		const autoCloseTimer = setTimeout(() => {
			console.log('⏰ Auto-closing sound webview after timeout');
			panel.dispose();
		}, 15000);

		// Clear timer if panel is disposed manually
		panel.onDidDispose(() => {
			clearTimeout(autoCloseTimer);
		});

		return panel;
	}

	private getSoundWebviewContent(): string {
		return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Copilot Sound Alert</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            position: relative;
        }
        .alert {
            text-align: center;
            padding: 40px;
            border-radius: 20px;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            transition: transform 0.2s ease;
            cursor: pointer;
            max-width: 400px;
        }
        .alert:hover {
            transform: scale(1.05);
        }
        .icon {
            font-size: 72px;
            margin-bottom: 20px;
        }
        .message {
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 15px;
        }
        .instruction {
            font-size: 16px;
            opacity: 0.9;
            margin-bottom: 20px;
        }
        .close-btn {
            position: absolute;
            top: 20px;
            right: 20px;
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 18px;
            transition: background 0.2s ease;
        }
        .close-btn:hover {
            background: rgba(255, 255, 255, 0.3);
        }
        .progress-bar {
            width: 100%;
            height: 4px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 2px;
            overflow: hidden;
            margin-top: 20px;
        }
        .progress-fill {
            height: 100%;
            background: rgba(255, 255, 255, 0.6);
            width: 0%;
            transition: width 0.1s linear;
        }
        .timer-text {
            font-size: 12px;
            opacity: 0.7;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <button class="close-btn" onclick="closePanel()" title="閉じる">×</button>
    <div class="alert" onclick="playSound()">
        <div class="icon">🤖🔊</div>
        <div class="message">Copilot Suggestion Ready!</div>
        <div class="instruction">👆 Click anywhere to hear the alert</div>
        <div class="progress-bar">
            <div class="progress-fill" id="progressFill"></div>
        </div>
        <div class="timer-text" id="timerText">Auto-close in 15s</div>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        let soundPlayed = false;
        let remainingTime = 15;
        
        function playSound() {
            if (soundPlayed) return;
            
            vscode.postMessage({
                type: 'userClicked',
                data: 'User clicked to play sound'
            });
            
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                
                // Create multiple tones for notification
                const frequencies = [800, 1000, 600, 1200];
                const volumes = [0.7, 0.8, 0.6, 0.9];
                
                frequencies.forEach((freq, index) => {
                    setTimeout(() => {
                        const oscillator = audioContext.createOscillator();
                        const gainNode = audioContext.createGain();
                        
                        oscillator.connect(gainNode);
                        gainNode.connect(audioContext.destination);
                        
                        oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
                        oscillator.type = 'sine';
                        
                        gainNode.gain.setValueAtTime(volumes[index], audioContext.currentTime);
                        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                        
                        oscillator.start(audioContext.currentTime);
                        oscillator.stop(audioContext.currentTime + 0.3);
                    }, index * 200);
                });
                
                soundPlayed = true;
                document.querySelector('.message').textContent = 'Sound Played!';
                document.querySelector('.instruction').textContent = '✅ Alert sound played successfully';
                document.querySelector('.timer-text').textContent = 'Closing in 3 seconds...';
                
                // Update progress bar for closing
                remainingTime = 3;
                updateProgressBar();
                
                vscode.postMessage({
                    type: 'soundPlayed',
                    data: 'Sound played successfully'
                });
                
            } catch (error) {
                vscode.postMessage({
                    type: 'error',
                    data: 'Sound failed: ' + error.message
                });
            }
        }
        
        function closePanel() {
            vscode.postMessage({
                type: 'closePanel',
                data: 'User requested to close'
            });
        }
        
        function updateProgressBar() {
            const progressFill = document.getElementById('progressFill');
            const timerText = document.getElementById('timerText');
            
            const maxTime = soundPlayed ? 3 : 15;
            const progress = ((maxTime - remainingTime) / maxTime) * 100;
            progressFill.style.width = progress + '%';
            
            if (remainingTime > 0) {
                if (soundPlayed) {
                    timerText.textContent = \`Closing in \${remainingTime}s...\`;
                } else {
                    timerText.textContent = \`Auto-close in \${remainingTime}s\`;
                }
            }
        }
        
        // Countdown timer
        const countdownInterval = setInterval(() => {
            remainingTime--;
            updateProgressBar();
            
            if (remainingTime <= 0) {
                clearInterval(countdownInterval);
            }
        }, 1000);
        
        // Initial progress bar update
        updateProgressBar();
        
        // Auto-attempt after 1 second (might work if user previously interacted)
        setTimeout(() => {
            if (!soundPlayed) {
                document.querySelector('.instruction').textContent = '👆 Click to play sound (auto-play blocked)';
            }
        }, 1000);
    </script>
</body>
</html>`;
	}

	private handleNotificationAction(selection: string | undefined) {
		switch (selection) {
			case 'View':
				vscode.commands.executeCommand('editor.action.inlineSuggest.trigger');
				break;
			case 'Settings':
				vscode.commands.executeCommand('workbench.action.openSettings', 'copilotPushNotifier');
				break;
		}
	}

	private flashStatusBar() {
		const originalText = this.statusBarItem.text;
		const originalColor = this.statusBarItem.color;
		
		// Flash red for attention
		this.statusBarItem.color = new vscode.ThemeColor('errorForeground');
		this.statusBarItem.text = "$(bell-dot) New Copilot Suggestion!";
		
		setTimeout(() => {
			this.statusBarItem.color = originalColor;
			this.statusBarItem.text = originalText;
		}, 2000); // Flash for 2 seconds
	}

	public tryWindowsToastXML() {
		console.log('🍞 Trying Windows Toast XML API...');
		
		try {
			// PowerShell script using Windows.UI.Notifications.ToastNotification
			const toastScript = `
Add-Type -AssemblyName Windows.UI
Add-Type -AssemblyName Windows.Data

# Create toast notification using Windows Runtime API
$ToastNotificationManager = [Windows.UI.Notifications.ToastNotificationManager]
$template = [Windows.UI.Notifications.ToastTemplateType]::ToastText02
$toastXml = $ToastNotificationManager::GetTemplateContent($template)

$textElements = $toastXml.GetElementsByTagName("text")
$textElements.Item(0).AppendChild($toastXml.CreateTextNode("🤖 GitHub Copilot")) | Out-Null
$textElements.Item(1).AppendChild($toastXml.CreateTextNode("New suggestion available! Click to view.")) | Out-Null

# Add audio element for sound
$audioElement = $toastXml.CreateElement("audio")
$audioElement.SetAttribute("src", "ms-winsoundevent:Notification.Default")
$audioElement.SetAttribute("loop", "false")
$toastXml.DocumentElement.AppendChild($audioElement) | Out-Null

$appId = "Microsoft.VSCode_8wekyb3d8bbwe!App"
$toast = [Windows.UI.Notifications.ToastNotification]::new($toastXml)
$ToastNotificationManager::CreateToastNotifier($appId).Show($toast)
			`.trim();
			
			const command = `powershell -Command "${toastScript.replace(/"/g, '\\"').replace(/\n/g, '; ')}"`;
			
			exec(command, (error: any, stdout: any, stderr: any) => {
				if (error) {
					console.error('❌ Windows Toast XML failed:', error);
					console.log('Trying WScript.Shell popup...');
					this.tryWScriptPopup();
				} else {
					console.log('✅ Windows Toast XML sent successfully');
					if (stdout) console.log('Toast XML stdout:', stdout);
					if (stderr) console.log('Toast XML stderr:', stderr);
				}
			});
			
		} catch (error) {
			console.error('❌ Windows Toast XML exception:', error);
			console.log('Trying WScript.Shell popup...');
			this.tryWScriptPopup();
		}
	}

	public tryWScriptPopup() {
		console.log('📢 Trying WScript.Shell popup...');
		
		try {
			// PowerShell script using WScript.Shell for popup
			const wscriptScript = `
$wshell = New-Object -ComObject wscript.shell
$result = $wshell.Popup("🤖 GitHub Copilot: New suggestion available! Click to view.", 10, "Copilot Push Notifier", 64 + 0)

# Play system sound
[System.Media.SystemSounds]::Notification.Play()
			`.trim();
			
			const command = `powershell -Command "${wscriptScript.replace(/"/g, '\\"')}"`;
			
			exec(command, (error: any, stdout: any, stderr: any) => {
				if (error) {
					console.error('❌ WScript popup failed:', error);
					console.log('Trying msg.exe command...');
					this.tryMsgCommand();
				} else {
					console.log('✅ WScript popup sent successfully');
					if (stdout) console.log('WScript stdout:', stdout);
					if (stderr) console.log('WScript stderr:', stderr);
				}
			});
			
		} catch (error) {
			console.error('❌ WScript popup exception:', error);
			console.log('Trying msg.exe command...');
			this.tryMsgCommand();
		}
	}

	public tryMsgCommand() {
		console.log('💬 Trying msg.exe command...');
		
		try {
			// Use Windows built-in msg.exe command
			const message = "🤖 GitHub Copilot: New suggestion available! Click to view.";
			const command = `msg * /TIME:10 "${message}"`;
			
			exec(command, (error: any, stdout: any, stderr: any) => {
				if (error) {
					console.error('❌ msg.exe failed:', error);
					console.log('All Windows notification methods failed, falling back to webview...');
					this.createSoundWebview();
				} else {
					console.log('✅ msg.exe sent successfully');
					if (stdout) console.log('msg.exe stdout:', stdout);
					if (stderr) console.log('msg.exe stderr:', stderr);
					
					// Play sound separately since msg.exe doesn't have built-in sound
					this.playWindowsSystemSound();
				}
			});
			
		} catch (error) {
			console.error('❌ msg.exe exception:', error);
			console.log('All Windows notification methods failed, falling back to webview...');
			this.createSoundWebview();
		}
	}

	public playWindowsSystemSound() {
		console.log('🔊 Playing Windows system sound...');
		
		try {
			const soundScript = `[System.Media.SystemSounds]::Notification.Play()`;
			const command = `powershell -Command "${soundScript}"`;
			
			exec(command, (error: any, stdout: any, stderr: any) => {
				if (error) {
					console.error('❌ System sound failed:', error);
				} else {
					console.log('✅ System sound played successfully');
				}
			});
			
		} catch (error) {
			console.error('❌ System sound exception:', error);
		}
	}

	public dispose() {
		this.statusBarItem.dispose();
		
		// タイマーのクリーンアップ
		if (this.activityTimer) {
			clearTimeout(this.activityTimer);
		}
		if (this.rapidTypingTimer) {
			clearTimeout(this.rapidTypingTimer);
		}
	}
}

// Monitor for text changes that might trigger Copilot
class TextChangeMonitor implements vscode.Disposable {
	private lastChangeTime: number = 0;
	private changeTimeout: NodeJS.Timeout | undefined;

	constructor(private copilotMonitor: CopilotMonitor) {}

	public onTextChange(document: vscode.TextDocument, changes: readonly vscode.TextDocumentContentChangeEvent[]) {
		const now = Date.now();
		this.lastChangeTime = now;

		// Clear previous timeout
		if (this.changeTimeout) {
			clearTimeout(this.changeTimeout);
		}

		// Set a timeout to check for suggestions after typing stops
		this.changeTimeout = setTimeout(() => {
			this.checkForCopilotSuggestions(document);
		}, 500); // Wait 500ms after last change
	}

	private async checkForCopilotSuggestions(document: vscode.TextDocument) {
		try {
			// Try to trigger inline suggestions to detect if Copilot has suggestions
			const position = vscode.window.activeTextEditor?.selection.active;
			if (position) {
				// Simulate checking for inline completions
				const completions = await vscode.commands.executeCommand(
					'vscode.executeCompletionItemProvider',
					document.uri,
					position
				) as vscode.CompletionList;

				if (completions && completions.items.length > 0) {
					const suggestion = completions.items[0].label.toString();
					this.copilotMonitor.onCopilotSuggestion(suggestion);
				}
			}
		} catch (error) {
			console.log('Error checking for Copilot suggestions:', error);
		}
	}

	public dispose() {
		if (this.changeTimeout) {
			clearTimeout(this.changeTimeout);
		}
	}
}

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
	console.log('Copilot Push Notifier extension is now active!');
	
	try {
		const copilotMonitor = new CopilotMonitor(context);
		const textChangeMonitor = new TextChangeMonitor(copilotMonitor);

		// Register commands
		const toggleCommand = vscode.commands.registerCommand('copilot-push-notifier.toggleNotifications', () => {
			console.log('Toggle command executed');
			copilotMonitor.toggleNotifications();
		});

		const testNotificationCommand = vscode.commands.registerCommand('copilot-push-notifier.testNotification', () => {
			console.log('Test notification command executed');
			
			// Only call playNotificationSound once
			copilotMonitor.playNotificationSound();
			
			// Send the Copilot suggestion notification (without additional sound by temporarily disabling it)
			const currentUseSound = copilotMonitor['settings'].useSound;
			copilotMonitor['settings'].useSound = false; // Temporarily disable to prevent double sound
			
			copilotMonitor.onCopilotSuggestion("Test suggestion from Copilot - this is a longer test message to ensure it meets the minimum length requirement");
			
			// Restore original setting
			copilotMonitor['settings'].useSound = currentUseSound;
			
			// No VS Code confirmation message - let Windows notification speak for itself
		});

		const toggleSoundCommand = vscode.commands.registerCommand('copilot-push-notifier.toggleSound', () => {
			console.log('Toggle sound command executed');
			copilotMonitor.toggleSound();
		});

		const toggleWindowsNotificationsCommand = vscode.commands.registerCommand('copilot-push-notifier.toggleWindowsNotifications', () => {
			console.log('Toggle Windows notifications command executed');
			copilotMonitor.toggleWindowsNotifications();
		});

		const testWindowsNotificationCommand = vscode.commands.registerCommand('copilot-push-notifier.testWindowsNotification', () => {
			console.log('Test Windows notification command executed');
			copilotMonitor.showWindowsNotification();
		});

		const testPowerShellNotificationCommand = vscode.commands.registerCommand('copilot-push-notifier.testPowerShellNotification', () => {
			console.log('Test PowerShell notification command executed');
			copilotMonitor.tryPowerShellNotification();
		});

		const testWScriptPopupCommand = vscode.commands.registerCommand('copilot-push-notifier.testWScriptPopup', () => {
			console.log('Test WScript popup command executed');
			copilotMonitor.tryWScriptPopup();
		});

		const testMsgCommandCommand = vscode.commands.registerCommand('copilot-push-notifier.testMsgCommand', () => {
			console.log('Test msg.exe command executed');
			copilotMonitor.tryMsgCommand();
		});

		const toggleVSCodeNotificationsCommand = vscode.commands.registerCommand('copilot-push-notifier.toggleVSCodeNotifications', () => {
			console.log('Toggle VS Code notifications command executed');
			copilotMonitor.toggleVSCodeNotifications();
		});

		const toggleSilentModeCommand = vscode.commands.registerCommand('copilot-push-notifier.toggleSilentMode', () => {
			console.log('Toggle silent mode command executed');
			copilotMonitor.toggleSilentMode();
		});

		// Monitor text document changes
		const textChangeDisposable = vscode.workspace.onDidChangeTextDocument((event) => {
			textChangeMonitor.onTextChange(event.document, event.contentChanges);
			// Copilot作業状態監視も追加
			copilotMonitor.onTextActivity(event.document, event.contentChanges);
		});

		// Monitor active editor changes (作業中断を検出)
		const activeEditorChangeDisposable = vscode.window.onDidChangeActiveTextEditor((editor) => {
			if (editor) {
				console.log('Active editor changed - potential work interruption');
				copilotMonitor.onEditorChange(editor);
			}
		});

		// Register configuration change listener
		const configChangeDisposable = vscode.workspace.onDidChangeConfiguration((event) => {
			if (event.affectsConfiguration('copilotPushNotifier')) {
				console.log('Copilot Push Notifier configuration changed');
			}
		});

		// Add all disposables to context
		context.subscriptions.push(
			toggleCommand,
			testNotificationCommand,
			toggleSoundCommand,
			toggleWindowsNotificationsCommand,
			testWindowsNotificationCommand,
			testPowerShellNotificationCommand,
			testWScriptPopupCommand,
			testMsgCommandCommand,
			toggleVSCodeNotificationsCommand,
			toggleSilentModeCommand,
			textChangeDisposable,
			activeEditorChangeDisposable,
			configChangeDisposable,
			copilotMonitor,
			textChangeMonitor
		);
		
		console.log('Copilot Push Notifier extension activated successfully');
		// Extension now runs silently - Windows notifications will provide all user feedback
	} catch (error) {
		console.error('Error activating Copilot Push Notifier:', error);
		// Only show error message if not in silent mode
		const config = vscode.workspace.getConfiguration('copilotPushNotifier');
		const disableAllVSCodeMessages = config.get('disableAllVSCodeMessages', false);
		
		if (!disableAllVSCodeMessages) {
			vscode.window.showErrorMessage('Failed to activate Copilot Push Notifier: ' + error);
		}
	}
}

// This method is called when your extension is deactivated
export function deactivate() {}
