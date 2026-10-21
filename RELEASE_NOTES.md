# Dockit v0.8.1 🚀

Dockit **v0.8.1** introduces **Multi-Tab Terminal Sessions** in the global bottom host terminal drawer with concurrent session isolation, tab status indicators, and keyboard shortcuts, alongside comprehensive **Open-Source Community Health & Governance** standards (automated GitHub Actions CI, Dependabot, issue/PR templates, and contributor guidelines).

---

### ✨ What's New & Highlights

#### 📑 Multi-Tab Host Terminal Drawer
- **Concurrent Shell Tabs**: Spawn multiple independent terminal tabs directly in the bottom drawer. Each tab runs its own isolated backend session with independent working directory (`cwd`), execution queue, and process context.
- **Titlebar Tab Strip**: Integrated tab strip in the terminal drawer header showing tab titles, active command progress spinners, working directory path chips, and tab close buttons (`×`).
- **1-Click & Keyboard Add Tab**: Create new terminal tabs via the `+ New Tab` button in the header or via keyboard shortcut (<kbd>Ctrl + Shift + `</kbd>).
- **Fast Tab Navigation**: Switch between tabs instantly using <kbd>Alt + [1-9]</kbd> or by clicking the tab headers.
- **Persistent Tab Counter Badge**: The bottom status bar toggle button now displays the active tab count (e.g., `Terminal (2)`), keeping you aware of running sessions even when the drawer is minimized.
- **Isolated Cancellation & Output**: Cancelling a command (<kbd>Ctrl + C</kbd>) in one tab does not interrupt jobs running in other tabs. Each tab preserves its own command history and scrollback buffer.
- **Automatic Compose Directory Sync**: Seamlessly sync the terminal's working directory to the currently active Docker Compose project with one click across any open tab.

#### 🛡️ Open-Source Governance & CI Automation
- **GitHub Actions Continuous Integration**: Automated CI pipeline verifying code formatting (`gofmt`), Go static analysis and tests (`go vet`, `go test`), and frontend production build (`npm run build`) on every push and pull request.
- **Automated Dependency Updates**: Configured Dependabot for automated Go modules and npm package vulnerability detection and updates.
- **Contributor Guidelines & Templates**: Standardized open-source workflow with comprehensive `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, and issue/PR templates for bug reports and feature proposals.

---

### 📦 Artifacts Included
- **Linux**:
  - `dockit-linux-amd64.deb` (Debian, Ubuntu, Linux Mint, Pop!_OS)
  - `dockit-linux-amd64.rpm` (Fedora, RHEL, CentOS, openSUSE)
  - `dockit-linux-amd64.tar.gz` (Portable Linux archive)
- **Windows**:
  - `dockit-windows-amd64.exe` (Standalone Windows executable)
  - `dockit-windows-amd64.zip` (Portable Windows archive)
