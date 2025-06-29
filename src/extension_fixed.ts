// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

interface CopilotNotifierSettings {
	enabled: boolean;
	showInfoMessages: boolean;
	showWarningMessages: boolean;
	minimumSuggestionLength: number;
	useSound: boolean;
	useModalNotifications: boolean;
	notificationType: 'info' | 'warning' | 'error';
}

class CopilotMonitor implements vscode.Disposable {
	private statusBarItem: vscode.StatusBarItem;
	private suggestionCount: number = 0;
	private settings: CopilotNotifierSettings;

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
			notificationType: config.get('notificationType', 'warning')
		};
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
		vscode.window.showInformationMessage(message);
	}

	public toggleSound() {
		this.settings.useSound = !this.settings.useSound;
		const config = vscode.workspace.getConfiguration('copilotPushNotifier');
		config.update('useSound', this.settings.useSound, vscode.ConfigurationTarget.Global);
		
		const message = this.settings.useSound 
			? "🔊 Copilot notification sound enabled!" 
			: "🔇 Copilot notification sound disabled!";
		
		console.log(`Sound toggled: ${this.settings.useSound}`);
		vscode.window.showInformationMessage(message);
		
		if (this.settings.useSound) {
			// Test the sound immediately
			console.log('Testing sound after toggle...');
			this.playNotificationSound();
		}
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

		const truncatedSuggestion = suggestion.length > 50 
			? suggestion.substring(0, 47) + "..." 
			: suggestion;
		
		const message = `🤖 Copilot suggestion available: "${truncatedSuggestion}"`;
		const actions = ['View', 'Dismiss', 'Settings'];

		// Choose notification type based on settings
		switch (this.settings.notificationType) {
			case 'warning':
				if (this.settings.useModalNotifications) {
					vscode.window.showWarningMessage(message, { modal: true, detail: "Click 'View' to see the full suggestion." }, ...actions)
						.then(this.handleNotificationAction.bind(this));
				} else {
					vscode.window.showWarningMessage(message, ...actions)
						.then(this.handleNotificationAction.bind(this));
				}
				break;
			case 'error':
				vscode.window.showErrorMessage(message, ...actions)
					.then(this.handleNotificationAction.bind(this));
				break;
			default:
				if (this.settings.showInfoMessages) {
					vscode.window.showInformationMessage(message, ...actions)
						.then(this.handleNotificationAction.bind(this));
				}
				break;
		}

		// Additional visual feedback - flash the status bar
		this.flashStatusBar();
	}

	public playNotificationSound() {
		try {
			console.log('🔊 Playing notification sound...');
			
			// Create an interactive webview for sound
			this.createSoundWebview();
			
		} catch (error) {
			console.error('❌ Error in playNotificationSound:', error);
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
						break;
					case 'userClicked':
						console.log('👆 User clicked to play sound');
						break;
					case 'error':
						console.log('❌ Webview error:', message.data);
						break;
				}
			},
			undefined,
			this.context.subscriptions
		);

		panel.webview.html = this.getSoundWebviewContent();

		// Auto-close after 5 seconds
		setTimeout(() => {
			panel.dispose();
		}, 5000);

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
            cursor: pointer;
        }
        .alert {
            text-align: center;
            padding: 40px;
            border-radius: 20px;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            transition: transform 0.2s ease;
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
        }
    </style>
</head>
<body onclick="playSound()">
    <div class="alert">
        <div class="icon">🤖🔊</div>
        <div class="message">Copilot Suggestion Ready!</div>
        <div class="instruction">👆 Click anywhere to hear the alert</div>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        let soundPlayed = false;
        
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

	public dispose() {
		this.statusBarItem.dispose();
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
			// Force sound test regardless of settings
			copilotMonitor.playNotificationSound();
			copilotMonitor.onCopilotSuggestion("Test suggestion from Copilot - this is a longer test message to ensure it meets the minimum length requirement");
			vscode.window.showInformationMessage('Test notification sent with sound!');
		});

		const toggleSoundCommand = vscode.commands.registerCommand('copilot-push-notifier.toggleSound', () => {
			console.log('Toggle sound command executed');
			copilotMonitor.toggleSound();
		});

		// Monitor text document changes
		const textChangeDisposable = vscode.workspace.onDidChangeTextDocument((event) => {
			textChangeMonitor.onTextChange(event.document, event.contentChanges);
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
			textChangeDisposable,
			configChangeDisposable,
			copilotMonitor,
			textChangeMonitor
		);
		
		console.log('Copilot Push Notifier extension activated successfully');
		vscode.window.showInformationMessage('Copilot Push Notifier is now active!');
	} catch (error) {
		console.error('Error activating Copilot Push Notifier:', error);
		vscode.window.showErrorMessage('Failed to activate Copilot Push Notifier: ' + error);
	}
}

// This method is called when your extension is deactivated
export function deactivate() {}
