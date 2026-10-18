<p align="center">
  <img src="assets/dockit-logo-full.png" alt="Dockit Logo" width="240" />
</p>

# Dockit 🐳 🦭

> A modern, fast, cross-platform desktop container management application supporting **Docker** and **Podman** simultaneously with unified abstractions, staged Compose testing, multi-registry exploration, and built-in runtime detection & installation.

Built with **Go (Wails v2)** + **React 19** + **Tailwind CSS v4** + **Base UI / Shadcn**.

---

## ✨ Features

### 🔄 Unified Docker & Podman Engine Abstraction
- Seamlessly switch between **Docker** and **Podman** at runtime with a single click.
- Automatic detection of standard sockets, user rootless sockets (`/run/user/$UID/podman/podman.sock`), rootful sockets, and Windows named pipes (`//./pipe/docker_engine`).
- Custom socket endpoint overrides supported via persistent configuration.

### 💻 Global Host Terminal Drawer (<kbd>Ctrl + `</kbd>)
- **VS Code-Style Bottom Drawer**: Press <kbd>Ctrl + `</kbd> (or click the bottom status bar) anywhere in the application to summon an integrated host terminal.
- **Stateful Directory Navigation**: Persists current working directory (`cd`) across executions, starting at user home (`~`).
- **1-Click Compose Directory Sync**: Instant titlebar shortcut to switch the terminal's working directory directly to your active Docker Compose workspace root.
- **Full Clipboard Integration**: Native <kbd>Ctrl + V</kbd> and Linux terminal <kbd>Ctrl + Shift + V</kbd> paste support, click-to-focus prompt area, and a 1-click **Paste** button in the titlebar.
- **Safe Process Group Termination**: Interrupt long-running commands anytime with <kbd>Ctrl + C</kbd> or titlebar **Stop** button with process group isolation (`Setpgid`), cleanly killing the entire process tree without leaving orphaned background processes.
- **Interactive TTY Interceptor**: Detects full-screen CLI tools (`vim`, `nano`, `top`, `less`) and provides instant hints with non-interactive alternatives.

### 📦 Containers Management & Interactive Terminal
- View, start, stop, restart, pause, unpause, and delete containers.
- **Multi-Select & Batch Actions**: Select multiple containers with row/master checkboxes to start, stop, restart, or delete multiple containers in 1 click with a consolidated confirmation prompt.
- Real-time container status badges, port bindings, and created timestamps.
- **Real-Time Resource Metrics**: Live CPU usage %, memory consumption (MB/GB) with limits, incoming/outgoing network I/O traffic, and block disk I/O / PIDs streamed directly on the overview tab.
- **In-Container Terminal Shell (Exec)**: Launch an interactive shell terminal (`/bin/sh`, `/bin/bash`) directly into running containers to run commands, inspect runtime state, and interrupt executions with <kbd>Ctrl + C</kbd>.
- **Full-Height Responsive Stretch**: Terminal, live logs, and raw inspection views expand to fill large desktop screens.
- **Clipboard & Paste Support**: Full support for <kbd>Ctrl + V</kbd>, <kbd>Ctrl + Shift + V</kbd>, and a 1-click **Paste** button.
- **Log Streaming, Search Navigation & Highlighting**: Live container logs with auto-scroll to latest entries on open/stream, interactive Next/Previous match navigation arrows (<kbd>▲</kbd> / <kbd>▼</kbd> and <kbd>Enter</kbd> / <kbd>Shift+Enter</kbd>), dynamic active match highlighting with live match counters (`1/14`), toggleable full-context vs filtered line modes, and clipboard copy.
- **Execution & Runtime Inspector Dialog (<kbd>Maximize2</kbd>)**: Clean, formatted timestamps (`YYYY-MM-DD HH:mm:ss`) preventing card overflow, with an Expand button opening a comprehensive inspection dialog showcasing runtime state, PID, exit codes, OOMKilled status, duration uptime, network details, and full raw JSON copying.
- **Inspect Inspector**: Deep JSON inspection of low-level container configurations and network settings.
- **Create Container Wizard Overhaul**: Interactive dialogs to spin up containers with:
  - **Port Bindings Dialog**: Table view with protocol selector (`TCP`/`UDP`), quick string mode, and 1-click presets for popular development services (HTTP, HTTPS, Postgres, MySQL, Redis, Node, Vite).
  - **Environment Variables Manager**: Visual key-value table, raw `.env` multi-line editing, and 1-click `.env` file uploading with live preview chips and overflow protection.
  - **Command Override Editor**: Dedicated multi-line command editor with live Docker argument tokenizer preview (`[0]`, `[1]`, `[2]`), quote preservation, and built-in snippets (Keep-Alive, interactive shells, wrapper scripts).

### 🖼️ Images & Local Cache
- List local images with repository tags, IDs, and human-readable sizes.
- **Batch Removal**: Select multiple images via checkboxes to delete them in a single batch with safety confirmations.
- Pull images from any public or private registry directly from the UI.
- Tag and inspect local image layers.
- Delete and prune unused images safely.

### 💾 Persistent Volumes & 🌐 Virtual Networks
- **Volumes**: Manage persistent storage volumes, inspect mount points, create new local volumes, batch-delete selected volumes via checkboxes, and prune dangling volumes.
- **Networks**: Inspect virtual bridges, host networks, overlays, and custom internal networks with IPAM subnet information.

### 🧹 Visual Disk Space & Prune Dashboard ("Reclaim Storage")
- **Storage Breakdown**: Visual breakdown of disk space consumed by Images, Containers, Volumes, and Build Cache with reclaimable percentage metrics.
- **1-Click Quick Clean**: Safely purges stopped container layers, dangling images, and build cache in a single tap without impacting running workloads.
- **Selective Prune**: Dedicated controls to prune specific categories (stopped containers, dangling images, unattached volumes, build cache, unused networks).
- **Accessible Dual-Theme Design**: Polished high-contrast views across both Dark Mode and Light Mode with consistent true-dark terminal styling.

### 🛡️ Reliability & Resource Optimization Architecture
- **Floating Toast Notifications**: Non-blocking toast alerts (success, error, warning, info) with one-click error copying, replacing native browser alerts.
- **Smart Engine Offline Throttling**: Automatically detects when Docker/Podman is stopped, backing off container polling to eliminate socket churn while keeping host metrics active, and resuming instantly once the engine starts.
- **Process Group Isolation**: Command execution in host terminal creates dedicated process groups (`Setpgid`), preventing orphaned child processes upon cancellation or timeout.
- **Log Fetching Efficiency**: Subtab navigation in Container Details only retrieves logs when the Logs tab is active, avoiding redundant 500KB network transfers on every subtab switch.
- **Bounded Memory & Output Truncation**: Terminal history arrays capped to 150 items and outputs over 100,000 characters safely truncated to keep RAM and DOM slim during long sessions.
- **Defensive Backend Context Timeouts**: 120-second bounded execution across container exec and shell operations to prevent hung processes or leaked goroutines.
- **Human-Readable Engine Errors**: Context-aware formatting for common Docker and Podman daemon error codes.
- **Keyboard-Accessible Confirmation Dialogs**: Polished in-app modal confirmations (<kbd>Enter</kbd> / <kbd>Esc</kbd>) for all destructive operations.
- **React Error Boundaries**: Component-level isolation preventing white-screen crashes with instant 1-click view reloading.
- **Window Focus Auto-Sync**: Automatically refreshes container states and host metrics whenever the window regains focus.
- **Lightweight Memory Management & Proactive GC**: Proactive Go runtime heap recycling (`GOGC=50`, 256MB soft memory limit) and a 45-second idle memory scavenger (`debug.FreeOSMemory()`), returning unused pages back to the host OS.
- **Visibility-Aware Throttled Polling**: Automatic pause on background polling and resource streaming when Dockit is minimized or inactive (`document.hidden`), saving CPU cycles and memory churn.

### 🧪 Docker Compose Studio & Workspace
- **Multi-Project Library**: Open folders containing `docker-compose.yml`, clone from Git URLs, or browse recent projects with persistent history.
- **Dedicated Project Workspace**:
  - **Visual Services Grid**: Context-aware Start, Stop, and Restart controls based on actual container running states.
  - **Compose Down Modal**: Choose cleanup options including volume removal (`--volumes`), orphan cleanup (`--remove-orphans`), and image deletion (`--rmi all`).
  - **Conditional `.env` Environment Tab**: Shows `.env` tab dynamically when the project contains an environment file, with 1-click `+ Add .env` and `Delete .env` management.
  - **YAML Testing Studio**: Edit compose configs with live syntax highlighting and non-destructive memory staging.
  - **Git-Style Blob Hashing (`sha256`) & Snapshots**: Authentic Git object ID hashing (`blob <length>\0<data>`) detects uncommitted edits and provides snapshot rollbacks.
  - **Live CLI Stream**: Real-time terminal output stream for Compose Up, Down, and service orchestration commands.

### 🌍 Unified Registry Hub
- Multi-registry exploration across **Docker Hub** and **GitHub Container Registry (GHCR)**.
- **Full-Page Responsive Grid**: Spacious full-width search card grid (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`) with 1-click popular search keywords (Nginx, Node, Python, Redis, Postgres, Ubuntu, Alpine, Golang).
- **Dedicated Image Documentation Workspace**: Clicking any image navigates smoothly to a dedicated full-page view with top navigation, breadcrumbs, and "← Back to Search Results".
- **Rich Markdown Documentation**: Full repository READMEs rendered in rich GitHub-flavored Markdown with code copy, formatted tables, and external documentation links opened via your default OS browser without horizontal squishing.
- **Tags & Architecture Browser**: Inspect tag layers, image sizes, and release dates with one-click pull commands.
- **Adaptive Number Formatting**: High-density star and pull counters (e.g. `1.14B+`, `34.8K`) with native hover tooltips showing exact counts.
- One-click image pulling and favorites bookmarking.

### 🎨 Themes & Adaptive UI
- Fully integrated **Dark Mode** and **Light Mode** with WCAG AA compliant contrast across all cards, modals, and tables.
- **Keep-Alive View State Retention**: Navigating between tabs (Compose Studio, Registry Hub, Containers, Images, Volumes, Cleanup) preserves working state, active search queries, documentation views, YAML editors, and scroll positions without component unmounting.
- Responsive overflow protection with ellipsis truncation (`...`) and compact layouts for small displays and laptops.

### 🔄 In-Place Self-Updates & Release Management
- **Background Release Detection**: Automatic GitHub Releases checking with non-intrusive floating toast notifications and configurable startup toggles.
- **Native Package Detection & Root Elevation**: Automatically selects the native package format matching the installation (`.deb`, `.rpm`, `.exe`, `.tar.gz`) with PolicyKit (`pkexec`) authorization for system installs.
- **In-Memory Extraction & Atomic Replacement**: Downloads platform-matched binaries, unpacks in memory, and swaps the running executable in-place.
- **Instant Restart**: One-click **Restart Now** action respawns the updated binary seamlessly (VS Code-style UX).

### 🛠️ Runtime Detection & Engine Installer
- Cross-platform detection for Docker and Podman daemon states.
- Automated installation plans explaining prerequisites, package managers (APT, DNF, Pacman, Homebrew, Winget, Chocolatey), and privilege explanations (why `sudo` or admin is required).
- One-click trigger to install and configure container runtimes if not already present.

---

## 🏗️ Architecture

```
dockit/
├── app.go                      # Wails RPC backend bridge binding internal domains
├── main.go                     # Wails application entrypoint & window configuration
├── internal/
│   ├── runtime/                # Unified runtime abstraction
│   │   ├── runtime.go          # Runtime interface
│   │   ├── engine/             # Shared moby client implementation (containers, images, etc.)
│   │   ├── docker/             # Docker socket client connector
│   │   └── podman/             # Podman rootless/rootful socket auto-detector
│   ├── containers/             # Container lifecycle domain service
│   ├── images/                 # Image management domain service
│   ├── volumes/                # Volume domain service
│   ├── networks/               # Network domain service
│   ├── compose/                # Project parser, staged sandbox manager & CLI runner
│   ├── terminal/               # Stateful host terminal execution & process group management
│   ├── registry/               # Docker Hub & GHCR search/metadata clients
│   ├── config/                 # App local storage & user preferences manager (atomic JSON)
│   └── installer/              # Safe detection, authorization explanation, & OS installers
│       ├── linux/              # apt, dnf, pacman, zypper
│       ├── macos/              # brew, colima, docker desktop
│       └── windows/            # winget, choco
└── frontend/                   # React 19 + Tailwind v4 + Base UI
    ├── src/
    │   ├── components/         # Views: Containers, Images, Volumes, Networks, Compose, Registry, Settings, Modals
    │   ├── lib/utils.js        # Class merging utilities
    │   ├── App.jsx             # Main dashboard coordinator
    │   └── main.jsx
    └── wailsjs/                # Auto-generated RPC bindings between Go and JS
```

---

## 🚀 Getting Started

### Prerequisites
- **Go**: `1.22+`
- **Node.js**: `18+` & `npm`
- **Wails CLI**: `v2.9+` (`go install github.com/wailsapp/wails/v2/cmd/wails@latest`)
- Either **Docker** (`docker engine` or `docker desktop`) or **Podman** installed (or install them directly via Dockit's built-in installer!).

### Installation & Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Amanbig/dockit.git
   cd dockit
   ```

2. **Install frontend dependencies**:
   ```bash
   cd frontend
   npm install
   cd ..
   ```

3. **Run in Live Development Mode**:
   ```bash
   wails dev
   ```
   > **Note for Linux (Ubuntu 24.04+, Linux Mint 22+, or WebKitGTK 4.1 users)**:  
   > If your distro uses `libwebkit2gtk-4.1-dev`, run with:  
   > ```bash
   > wails dev -tags webkit2_41
   > ```
   This spins up Vite with hot-reloading for the React UI and binds your Go methods in real time.

4. **Run Unit Tests**:
   ```bash
   go test ./...
   ```

---

## 📦 Production Build

To compile a self-contained desktop binary for your current operating system:

```bash
wails build
```

*(On Linux systems with WebKitGTK 4.1, use `wails build -tags webkit2_41`)*

The compiled binary will be placed inside the `build/bin/` directory.

### Target Platforms
- **Linux**: Standard binary / `.deb` / `.rpm`
- **macOS**: `.app` bundle / `.dmg`
- **Windows**: `.exe` executable / MSI installer

---
