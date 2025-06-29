# Copilot Instructions

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

This is a VS Code extension project. Please use the get_vscode_api with a query as input to fetch the latest VS Code API references.

## Project Overview
This VS Code extension monitors GitHub Copilot suggestions and sends push notifications when choices/suggestions are presented to the user. The extension primarily uses Windows native notifications for optimal user experience without requiring web notification permissions.

## Key Features
- Monitor Copilot inline completion events
- Send Windows native OS notifications with system sound
- Multi-tier fallback notification system (no web permissions required)
- Configurable notification preferences
- Optional VS Code internal notifications (can be disabled)
- Support for different notification types (info, warning, etc.)
- Status bar integration with visual feedback

## Development Guidelines
- Use TypeScript for all source code
- Follow VS Code extension best practices
- Implement proper error handling
- Use VS Code's notification APIs for user feedback
