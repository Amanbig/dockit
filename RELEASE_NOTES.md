# Dockit v0.9.4 🚀

Dockit **v0.9.4** brings a major upgrade to the terminal experience with **Interactive xterm.js Terminal Sessions powered by a native Go PTY backend**, complete **Container Exec Shell synchronization**, and comprehensive **UI/UX design polish** including Figtree typography, design tokens, table density controls, and skeleton loaders.

---

### ✨ What's New & Highlights

#### 💻 Interactive xterm.js Terminal with Native PTY Engine
- **Full Pseudo-Terminal (PTY) Backend**: Switched from line-buffered execution to true interactive PTY streaming via `aymanbagabas/go-pty`. Run full-screen interactive TUI applications (`top`, `htop`, `vim`, `nano`, `less`), bash/zsh command completions, and escape sequence formatting directly inside Dockit.
- **Multi-Tab Bottom Terminal Drawer**: Persistent bottom drawer supporting multiple concurrent interactive terminal tabs with independent working directories, dynamic PTY window resizing, and live `/proc/<pid>/cwd` directory tracking on Linux.
- **Native Clipboard & Mouse Interactions**: Full support for <kbd>Ctrl+Shift+C</kbd> / <kbd>Ctrl+Shift+V</kbd>, Middle-Click paste, right-click context menus with Copy/Paste/Select All/Clear, and auto-fit terminal viewport scaling.

#### 🚢 Container Interactive Exec Shell & Lifecycle Synchronization
- **Live Container Shell Exec**: Open real-time interactive shell sessions (`docker exec -it <container> sh`) directly into running containers with full PTY support.
- **Real-Time Engine State Sync**: Terminal views are now tightly synchronized with the container runtime state. Starting, stopping, or restarting a container from the sidebar, in-page action, or external CLI immediately updates the terminal state without stale errors.
- **Automatic Session Cleanup & Reconnect**: Cleanly closes dangling PTY processes when containers stop, preventing lingering daemon error messages (`Container ... is not running`). Includes an in-terminal disconnect banner and header **"Reconnect"** button for instant re-attachment.
- **Container Uptime Badge**: Live calculated uptime indicator (`formatUptime`) on container status badges (e.g. `2h 15m`, `3d 4h`).

#### 🎨 Comprehensive UI/UX Polish & Design Tokens
- **Modern Figtree Typography**: Applied Figtree Variable font across the interface for a crisp, modern developer aesthetic.
- **CSS Design Token Architecture**: Unified surface palettes, borders, status dots, and focus rings (`*:focus-visible` with 2px cyan outline) via CSS custom properties.
- **Grouped Sidebar Navigation**: Nav items are now organized into clean sections (*Resources*, *Management*, *App*) with high-contrast left-accent borders (`.sidebar-nav-active`) and pulsing emerald status indicators for running containers.
- **Table Density Modes**: Toggle container table display between **Normal**, **Compact**, and **Dense** views, persisted via `localStorage`.
- **Skeleton Shimmer Loaders**: Reusable `.skeleton` shimmer loaders smooth out data transitions during initial load and runtime switches.
- **Smart Empty States**: Distinguishes between true empty states (no containers exist) and filtered empty states (no search matches), with a 1-click **"Clear filters"** CTA.
- **Smart Toast Notifications**: Error toasts remain visible until manually dismissed, while success toasts dismiss after 3 seconds, and info/warning toasts dismiss after 5 seconds.
- **Container Details Refinements**: Dedicated Offline Status Card for stopped containers with a 1-click "Start Container" CTA, search and filter for environment variables with "Copy All (.env)", and volume mount access mode badges (Read/Write vs Read-Only).

---

### 📥 Install & Update

#### Snap Store (Ubuntu / Debian / Fedora)
```bash
sudo snap install dockit
sudo snap connect dockit:docker
```

#### GitHub Releases
Download prebuilt binaries and installers from the [Releases page](https://github.com/Amanbig/dockit/releases/latest):
- **Linux**: `.deb`, `.rpm`, `.tar.gz`, `.snap`
- **Windows**: NSIS setup wizard installer `.exe`, portable `.zip`
- **macOS**: Apple Silicon & Intel Universal `.dmg`, portable `.zip`
