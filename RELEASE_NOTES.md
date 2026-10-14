# Dockit v0.4.1 🚀

Dockit **v0.4.1** is a major UI and polish release featuring a **Modern Frameless Window with Custom Controls**, a real-time **Host Hardware Resource Monitor** in the sidebar, **Automatic Linux Desktop & Icon Registration**, and fixed **Windows NSIS Installer (`.exe`) Generation**!

---

### ✨ What's New & Highlights

#### 🪟 Modern Frameless Window & Custom Controls
- **Custom Frameless Title Bar**:
  - Replaced native OS chrome with integrated, modern controls: **`—` Minimize**, **`□` Maximize / Restore**, and **`✕` Close**.
  - **Dynamic Maximize/Restore Toggle**: Smoothly switches between single square and dual-rectangle restore icons.
  - **Double-Click Header**: Double-clicking the spacious top header bar toggles maximize and restore.
  - **Smooth Window Dragging**: Designated drag region (`wails-drag`) allows effortless dragging across all operating systems.
  - **Curved Ends & Adaptive Elevation Shadow**: Features a `rounded-xl` curved frame with a soft, muted grey elevation shadow and perimeter border in windowed mode that cleanly snaps edge-to-edge when maximized.

#### 📊 Real-Time Host Hardware Monitor
- **Sidebar Resource Card**: Added a dedicated host resource card at the bottom of the navigation sidebar.
- **RAM Utilization**: Displays real-time physical memory in GB (`Used / Total GB`) with a percentage gauge and dynamic color-coded utilization bar (cyan $\to$ amber $\to$ rose).
- **CPU Metrics**: Live logical CPU core count (`Cores`) and instantaneous CPU load percentage.
- **System Detection**: Instant identification of host operating system and CPU architecture (`linux / amd64`, `windows / amd64`, `darwin / arm64`).
- **Clean Sidebar Header**: Removed internal storage driver jargon (`overlayfs`) from the top header to ensure a clean, distraction-free interface.

#### 🐧 Automatic Linux Desktop & Icon Integration
- **Zero-Config Launcher**: Standalone portable binaries on Linux now automatically create and register `~/.local/share/applications/dockit.desktop` upon launch.
- **Hicolor Icon Extraction**: Automatically extracts the embedded 512x512 PNG icon to `~/.local/share/icons/hicolor/` and triggers icon cache updates.
- **Taskbar Icon Resolved**: Fixes missing/blank launcher squares on Linux Mint (Cinnamon), Ubuntu, Fedora, and GNOME taskbars.

#### 💿 Windows Installer Fix (`.exe`)
- **Automated NSIS Setup**: Configured CI/CD release workflow to install NSIS on Windows runners and compile `dockit-windows-amd64-installer.exe`.
- **Validation Check**: Releases strictly verify that the Windows installer is generated and published alongside the `.zip` archive.

#### 🎨 Command Palette & Table UI Polish
- **Command Palette Dark Mode**: Fixed an issue where the Command Palette rendered stark white in Dark mode.
- **Volumes Hash Truncation**: Truncates 64-character SHA volume hashes with clean ellipses and full hover tooltips (`title`).
- **Responsive Table Scrolling**: Added horizontal scrollbars to persistent volume lists on compact screens.

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
