# Dockit v0.8.0 🚀

Dockit **v0.8.0** is a major feature and performance release introducing the **VS Code-Style Global Bottom Host Terminal Drawer** (<kbd>Ctrl + `</kbd>) with stateful directory navigation and 1-click Compose directory synchronization, **Comprehensive Clipboard & Paste Integration** (native <kbd>Ctrl + V</kbd>, Linux standard <kbd>Ctrl + Shift + V</kbd>, and titlebar Paste buttons), **Process Group Isolation & Interruption** (<kbd>Ctrl + C</kbd>), **Conditional Compose `.env` File Management**, **Responsive Full-Height Terminal Stretch**, and significant **Resource Optimization & Daemon Offline Throttling**.

---

### ✨ What's New & Highlights

#### 💻 VS Code-Style Global Bottom Host Terminal Drawer (<kbd>Ctrl + `</kbd>)
- **Global Slide-Up Terminal**: Press <kbd>Ctrl + `</kbd> (or click the bottom status bar) anywhere in the application to summon an integrated host terminal without leaving Dockit.
- **Stateful Directory Navigation**: Persists your current working directory (`cd`) across commands, starting at user home (`~`) with clean path shortening (`~/projects/...`).
- **1-Click Compose Directory Sync**: When working in Compose Studio, a titlebar quick-nav button allows switching the terminal's working directory directly to the active project folder in one click.
- **Clean Titlebar Controls**: Maximize/restore drawer height (<kbd>65vh</kbd> / <kbd>h-72</kbd>), clear screen button, and session copy.

#### 📋 Comprehensive Clipboard & Paste Integration
- **Linux Terminal Convention (<kbd>Ctrl + Shift + V</kbd>)**: Standard HTML inputs ignore Shift when pasting. Dockit now explicitly intercepts <kbd>Ctrl + Shift + V</kbd> across both the Host Terminal drawer and Container Exec terminal to paste instantly.
- **Unfocused Terminal Paste (<kbd>Ctrl + V</kbd>)**: Clicking on output lines or history previously caused the input to lose focus. Pressing <kbd>Ctrl + V</kbd> or <kbd>Ctrl + Shift + V</kbd> anywhere within the terminal window now automatically routes clipboard contents directly into the prompt.
- **Click-to-Focus Prompt**: Simply clicking anywhere in the terminal scroll area immediately returns focus to the command input.
- **1-Click Titlebar Paste Button**: Added dedicated **Paste** buttons (`ClipboardPaste` icon) in the titlebar of both host and container terminals.
- **Native OS Clipboard Engine**: Utilizes Wails native OS clipboard (`window.runtime.ClipboardGetText()`) with graceful browser fallback.

#### 🛑 Command Interruption & Process Group Isolation
- **Global <kbd>Ctrl + C</kbd> Cancellation**: Pressing <kbd>Ctrl + C</kbd> cancels active host commands, halts container exec sessions, or clears the current prompt line.
- **Process Group Termination (`Setpgid`)**: Executed commands run within dedicated process groups on Unix. Canceling or timing out terminates both the shell and any child processes (such as background scripts, `sleep`, or `ping`), preventing orphaned zombie processes.
- **Interactive TTY Interceptor**: Detects full-screen interactive programs (`vim`, `nano`, `top`, `htop`, `less`, `more`) before execution, explaining that interactive TTYs cannot run inside inline subshells and offering convenient non-interactive alternatives.

#### 🌿 Conditional Compose `.env` Environment Management
- **Dynamic `.env` Tab**: The environment variable tab in Compose Studio is now conditionally displayed only when the project actually contains an `.env` file, decluttering projects that define variables directly in `docker-compose.yml`.
- **Inline Create & Delete**: Added a 1-click **+ Add .env** action when no file is present, and a **Delete .env** option with confirmation dialog.

#### 📐 Responsive Full-Height Terminal & Log Views
- **Large Screen Expansion**: In Container Details, the Terminal, Live Logs, and Raw JSON inspection panels expand responsively to fill the full height of larger desktop monitors instead of being locked to a fixed 400px box.
- **Theme Consistency**: Terminal consoles maintain an authentic true-dark visual style (`#0c1017`) across both Dark and Light application modes.

#### ⚡ Resource Optimization & Daemon Offline Throttling
- **Smart Engine Offline Backoff**: When Docker or Podman daemon is stopped, background container polling automatically backs off to eliminate socket churn and CPU load, while host hardware metrics continue updating smoothly. Once the daemon is started, full polling resumes automatically.
- **Subtab Fetching Efficiency**: Switching subtabs in Container Details only fetches logs when the Logs tab is active, eliminating redundant 500KB network transfers on every tab click.
- **Bounded In-Memory Buffers**: Terminal history arrays are capped to 150 entries, and single command outputs exceeding 100,000 characters are safely truncated to preserve browser DOM responsiveness and RAM.
- **Goroutine Leak Protection**: Added a 120-second execution context timeout to container exec operations to prevent hanging goroutines.

---

### 📦 Artifacts Included
- **Linux**:
  - `dockit-linux-amd64.deb` (Debian, Ubuntu, Linux Mint, Pop!_OS)
  - `dockit-linux-amd64.rpm` (Fedora, RHEL, CentOS, openSUSE)
  - `dockit-linux-amd64.tar.gz` (Portable Linux archive)
- **Windows**:
  - `dockit-windows-amd64.exe` (Standalone Windows executable)
  - `dockit-windows-amd64.zip` (Portable Windows archive)
- **macOS**:
  - `dockit-darwin-universal.zip` (Universal binary for Intel & Apple Silicon)
