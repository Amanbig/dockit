# Dockit v0.9.0 🚀

Dockit **v0.9.0** brings major UI/UX productivity upgrades including a **Collapsible Mini-Rail & Resizable Sidebar**, a **Bottom Dock Host Resources Monitor with Rolling Sparklines**, **1-Click Port Browser Launch**, **Smart Container Engine Startup**, and official **Ubuntu Snap Store Packaging** support.

---

### ✨ What's New & Highlights

#### 📐 Collapsible Mini-Rail & Smoothly Resizable Sidebar
- **58px Mini-Rail Mode**: Collapse the sidebar into a compact icon rail with tooltips to maximize workspace area for containers, logs, and Compose files.
- **Dedicated Hotkeys & Toggle**: Toggle sidebar state via the top header button or the universal shortcut (<kbd>Ctrl + B</kbd> / <kbd>Cmd + B</kbd>).
- **VS Code-Style Horizontal Resize Sash**: Freely drag the right border of the sidebar to customize width between 180px and 420px. Double-clicking the sash resets to default width (220px). Width preferences are persisted in `localStorage`.
- **Polished Footer Shortcut**: Cleaned up the footer GitHub link with responsive bullet separation (`GitHub • Amanbig/dockit ↗`) and text elision to prevent text collision across any sidebar width.

#### ⚡ 1-Click Engine Service Startup
- **Native Service Startup Plan**: If Docker or Podman is already installed on the machine but the daemon is inactive, Dockit offers a **Service Startup Plan** instead of repeating package manager installation commands:
  - **Linux**: Starts the systemd daemon/socket (`sudo systemctl start docker` with `pkexec` Polkit graphical prompt fallback, or `systemctl --user enable --now podman.socket`).
  - **macOS**: Launches Docker Desktop (`open -a Docker`) or boots the Podman virtual machine (`podman machine start`).
  - **Windows**: Launches Docker Desktop (`powershell -Command "Start-Process 'Docker Desktop.exe'"`) or starts the Podman WSL2 machine.
- **Instant Top Banner Action**: Start an offline daemon with one click directly from the amber warning banner without opening the configuration modal.

#### 📊 Bottom Dock Bar Host Metrics & Live Sparklines
- **Relocated System Monitor**: CPU, RAM, core count, and system architecture now sit cleanly in the bottom dock bar with an interactive popover.
- **Rolling SVG Sparklines**: The Host Resources popover includes rolling real-time sparkline graphs rendering the last 20 samples of CPU and memory utilization.
- **Quick Diagnostic Command Chips**: One-click chips in the terminal drawer header for running common diagnostics instantly: `docker ps`, `stats`, `system df`, `compose ps`, and `images`.

#### 🚢 Container Usability & Port Launching
- **1-Click Web App Launch**: Exposed container port mappings are now clickable links (`localhost:<port> ↗`) in both container cards and the detailed container view, opening the service in your default browser.
- **Live Logs Wrap & Export**: Toggle word wrapping in live container log streams and export raw console logs to `.txt` files with one click.
- **Contextual Action Cards**: View actions (Start, Stop, Restart, Pause, Delete) integrated directly into the sidebar panel when viewing container details, eliminating duplicate in-page buttons.
- **Universal Search Hotkey**: Press <kbd>/</kbd> anywhere outside input fields to focus the search and filter bar immediately.

#### 📦 Ubuntu Snap Store Distribution
- **Core24 Snapcraft Packaging**: Added complete Snapcraft configuration (`snap/snapcraft.yaml`) leveraging Ubuntu `core24`, WebKitGTK 4.1, desktop launchers, and application icons.
- **Docker Socket Interface**: Preconfigured with `docker`, `network`, `home`, `removable-media`, and `system-observe` plugs for secure, sandboxed container management.
- **Snap-Aware Update Management**: The in-app updater automatically detects running in a Snap environment and delegates lifecycle management to `snap refresh dockit`.

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
