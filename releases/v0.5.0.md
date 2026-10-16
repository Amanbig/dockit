# Dockit v0.5.0 🚀

Dockit **v0.5.0** is a major milestone release introducing a **Modern Frameless Window with Custom Controls**, a real-time **Host Hardware Resource Monitor** in the sidebar, a redesigned **Multi-Engine Operational Status System**, streamlined **Container Terminal Exec**, **Automatic Linux Desktop & Icon Registration**, and fixed **Windows NSIS Installer (`.exe`) Generation**!

---

### ✨ What's New & Highlights

#### 🪟 Modern Frameless Window & Custom Controls
- **Custom Frameless Title Bar**:
  - Replaced native OS chrome with integrated, modern controls: **`—` Minimize**, **`□` Maximize / Restore**, and **`✕` Close**.
  - **Dynamic Maximize/Restore Toggle**: Smoothly switches between single square and dual-rectangle restore icons.
  - **Double-Click Header**: Double-clicking the top draggable header toggles maximize and restore.
  - **Smooth Window Dragging**: Designated drag region (`wails-drag`) allows effortless dragging across all operating systems.
  - **Curved Corners & Elevation Shadow**: Features a `rounded-xl` curved frame with a soft, muted grey elevation shadow and perimeter border in windowed mode that cleanly snaps edge-to-edge when maximized.

#### 📊 Real-Time Host Hardware Monitor
- **Sidebar Resource Card**: Added a dedicated host resource monitor at the bottom of the navigation sidebar.
- **RAM Utilization**: Displays real-time physical memory in GB (`Used / Total GB`) with a percentage gauge and dynamic color-coded utilization bar (cyan $\to$ amber $\to$ rose).
- **CPU Metrics**: Live logical CPU core count (`Cores`) and instantaneous CPU load percentage.
- **System Detection**: Instant identification of host operating system and CPU architecture (`linux / amd64`, `windows / amd64`, `darwin / arm64`).
- **Clean Header**: Relocated technical details out of the top header into the sidebar for an uncluttered, modern workspace.

#### ⚡ Multi-Engine Operational Status & Detection
- **Accurate Real-Time Detection**: Replaced static status labels with live detection via container engine daemons and sockets.
- **Header Status Dots**:
  - 🟢 **Green**: Engine actively running.
  - 🟡 **Amber**: Engine installed, but daemon/socket stopped or offline.
  - 🔴 **Rose/Red**: Engine not installed.
- **Sidebar Status Badges**: Engine card clearly communicates `Ready`, `Offline`, or `Not Installed` with direct action buttons (`Install Podman`, `Start Daemon`).
- **Notification Banners**: Informative in-app banners with 1-click action triggers when the active engine is offline or missing.
- **Prevented Silent Engine Fallback**: Choosing Docker or Podman now connects exclusively to that engine without silent fallback or false "Ready" states.
- **IPC Stability**: Eliminated Go typed-nil interface trap and added 5-second timeouts to RPC calls to prevent UI loading lockups.

#### 💻 Revamped Container Terminal Exec
- **Streamlined Height**: Compacted console height to 360px, ensuring the terminal, subtabs, and container controls fit comfortably on any display without vertical overflow.
- **No Page Jump Scroll**: Replaced global `scrollIntoView()` with internal container scrolling and `preventScroll: true` on input focus, keeping page scroll position anchored at the top.
- **Clear Lifecycle States**: Renamed ambiguous "Container Offline" label to `Container Stopped`, complete with a live status dot.
- **Inline Start Trigger**: Added a 1-click `[Start Container]` button directly inside the terminal banner when viewing stopped containers.

#### 🎨 Light & Dark Mode Contrast Overhaul
- **High-Contrast Light Mode Banners**: Re-engineered status alerts with crisp rose and amber backgrounds, rich text typography (`#9f1239` / `#92400e`), and high-visibility action buttons.
- **Command Palette Polish**: Fixed Dark mode background rendering so the palette stays true dark.
- **Table Polish**: Long volume hashes are truncated with clean ellipses and hover tooltips, and horizontal scrolling is enabled for compact screens.

#### 🐧 Automatic Linux Desktop & Icon Integration
- **Zero-Config Launcher**: Standalone portable binaries on Linux now automatically create and register `~/.local/share/applications/dockit.desktop` upon launch.
- **Hicolor Icon Extraction**: Automatically extracts the embedded 512x512 PNG icon to `~/.local/share/icons/hicolor/` and triggers icon cache updates.
- **Taskbar Icon Resolved**: Fixes missing/blank launcher squares on Linux Mint (Cinnamon), Ubuntu, Fedora, and GNOME taskbars.

#### 💿 Windows Installer Fix (`.exe`)
- **Automated NSIS Setup**: Configured CI/CD release workflow to install NSIS on Windows runners and compile `dockit-windows-amd64-installer.exe`.
- **Validation Check**: Releases strictly verify that the Windows installer is generated and published alongside the `.zip` archive.

---

### 📦 Artifacts Included
- **Linux**:
  - `dockit-linux-amd64.deb` (Debian, Ubuntu, Linux Mint, Pop!_OS)
  - `dockit-linux-amd64.rpm` (Fedora, RHEL, CentOS, openSUSE)
  - `dockit-linux-amd64.tar.gz` (Portable Linux archive)
- **Windows**:
  - `dockit-windows-amd64-installer.exe` (NSIS Setup Wizard)
  - `dockit-windows-amd64.zip` (Portable executable)
- **macOS**:
  - `dockit-darwin-universal.dmg` (Drag-and-Drop Disk Image for Apple Silicon & Intel)
  - `dockit-darwin-universal.zip` (Universal application bundle)
