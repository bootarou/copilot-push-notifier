# Contributing to Copilot Push Notifier

Thank you for your interest in contributing to Copilot Push Notifier! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites

- Node.js 20.x or higher
- VS Code 1.101.0 or higher
- Git
- Windows OS (for testing native notifications)

### Setup Development Environment

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/your-username/copilot-push-notifier.git
   cd copilot-push-notifier
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Compile TypeScript**
   ```bash
   npm run compile
   ```

4. **Open in VS Code**
   ```bash
   code .
   ```

5. **Start debugging**
   - Press `F5` to launch Extension Development Host
   - Test the extension in the new VS Code window

## 📋 Development Guidelines

### Code Style

- **TypeScript**: Use TypeScript for all source code
- **Formatting**: Follow existing code formatting
- **ESLint**: Ensure no linting errors (`npm run lint`)
- **Comments**: Add meaningful comments for complex logic

### Project Structure

```
src/
├── extension.ts          # Main extension entry point
├── CopilotMonitor.ts    # Core monitoring logic
└── types/               # Type definitions

package.json             # Extension manifest
README.md               # Documentation
CHANGELOG.md            # Version history
```

### Testing

1. **Manual Testing**
   - Test all notification methods
   - Verify Copilot session monitoring
   - Check configuration changes
   - Test error scenarios

2. **Cross-Windows Testing**
   - Windows 10/11
   - Different notification settings
   - Various VS Code versions

## 🐛 Reporting Issues

### Before Submitting

1. **Search existing issues** to avoid duplicates
2. **Test with latest version**
3. **Check if it's a configuration issue**

### Issue Template

```markdown
**Describe the bug**
A clear description of the issue.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What you expected to happen.

**Environment:**
- OS: [e.g. Windows 11]
- VS Code Version: [e.g. 1.85.0]
- Extension Version: [e.g. 1.0.0]
- Node.js Version: [e.g. 20.0.0]

**Additional context**
Add any other context about the problem.
```

## 💡 Suggesting Features

### Feature Request Process

1. **Check existing feature requests**
2. **Discuss in GitHub Discussions** (if available)
3. **Create detailed feature request**

### Feature Request Template

```markdown
**Is your feature request related to a problem?**
A clear description of what the problem is.

**Describe the solution you'd like**
A clear description of what you want to happen.

**Describe alternatives you've considered**
Other solutions you've considered.

**Additional context**
Any other context or screenshots.
```

## 🔧 Pull Request Process

### Before Submitting PR

1. **Fork the repository**
2. **Create feature branch** (`git checkout -b feature/amazing-feature`)
3. **Make your changes**
4. **Test thoroughly**
5. **Update documentation** if needed
6. **Update CHANGELOG.md**

### PR Guidelines

1. **Clear title** describing the change
2. **Detailed description** of what was changed
3. **Link related issues** (`Fixes #123`)
4. **Add screenshots** for UI changes
5. **Ensure all checks pass**

### Code Review Process

1. **Automated checks** must pass
2. **Manual review** by maintainers
3. **Testing** on different environments
4. **Documentation** review if applicable

## 🏗️ Architecture Guidelines

### Extension Structure

- **CopilotMonitor**: Core monitoring and notification logic
- **TextChangeMonitor**: Text change detection
- **Settings Management**: Configuration handling
- **Notification System**: Multi-tier fallback notifications

### Adding New Features

1. **Consider backward compatibility**
2. **Add configuration options** when appropriate
3. **Implement proper error handling**
4. **Add logging** for debugging
5. **Update tests** and documentation

### Notification System

When adding new notification methods:

1. **Implement fallback logic**
2. **Test error scenarios**
3. **Add configuration options**
4. **Update test commands**

## 📚 Resources

### Useful Links

- [VS Code Extension API](https://code.visualstudio.com/api)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Node.js Documentation](https://nodejs.org/docs/)
- [Windows Notification API](https://docs.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-shell_notifyiconw)

### Community

- **GitHub Discussions**: For general questions and discussions
- **GitHub Issues**: For bug reports and feature requests
- **Pull Requests**: For code contributions

## 📜 License

By contributing to Copilot Push Notifier, you agree that your contributions will be licensed under the MIT License.

## 🙏 Recognition

Contributors will be recognized in:
- CHANGELOG.md for their contributions
- GitHub contributors list
- Special mentions for significant contributions

Thank you for contributing to Copilot Push Notifier! 🎉
