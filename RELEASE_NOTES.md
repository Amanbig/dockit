# Dockit v0.6.2 🚀

Dockit **v0.6.2** delivers a major upgrade to **Container Logs** with auto-scrolling to latest logs and search keyword highlighting, a comprehensive **Reliability & Error Handling Architecture** (replacing native alerts with toast notifications and in-app confirm dialogs), automatic native package selection in the **In-App Updater**, and refined **Disk Space & Prune Dashboard** visuals.

---

### ✨ What's New & Highlights

#### 📜 Container Logs Experience Overhaul
- **Auto-Scroll to Bottom on Open**: Opening the container details **Live Logs** tab or the standalone **Logs Modal** now automatically scrolls directly to the newest log entries at the bottom instead of staying anchored at line 1.
- **Search Query Keyword Highlighting**: Filtering logs by search term now highlights matching substrings with high-contrast, theme-aware `<mark>` styling so you can spot errors, warnings, or keywords instantly.
- **Dedicated "Scroll to Bottom" Actions**: Added 1-click scroll-to-bottom buttons with auto-tail synchronization across both the details view and the logs modal.
- **Search Match Feedback**: Added clear (✕) buttons to search inputs and live matching line count indicators (`Showing X of Y lines`).

#### 🔔 Modern Toast System & Friendly Engine Error Parsing
- **Non-Blocking Toasts**: Replaced all native browser `alert()` popups with sleek, animated toast notifications for success, warnings, info, and errors.
- **Human-Readable Engine Errors**: Raw Docker/Podman socket errors (e.g. `context deadline exceeded`, `No such container`, `permission denied`, `port is already allocated`) are parsed into clean, helpful guidance with one-click full error copying.

#### 🛡️ In-App Confirmation Dialogs (<kbd>Enter</kbd> / <kbd>Esc</kbd>)
- **No More Native Prompts**: Replaced all blocking `window.confirm()` calls with a polished in-app confirmation modal.
- **Keyboard-Accessible**: Press <kbd>Enter</kbd> to confirm or <kbd>Esc</kbd> to cancel actions safely.
- **Danger Visuals**: Destructive actions (like container deletion, volume removal, or system pruning) are clearly highlighted with red warning icons and danger button styles.

#### 🛡️ Application Reliability, Error Boundaries & Timeouts
- **React Error Boundaries**: Added top-level and per-view error boundaries to gracefully catch rendering issues and offer a 1-click view reload instead of crashing to a blank white screen.
- **Defensive Backend Timeouts**: Bound all Go backend RPC methods with defensive 15-second context timeouts (`getContext(15 * time.Second)`) to prevent UI lockups if an engine socket hangs.
- **Window Focus Auto-Sync**: Dockit now listens for window `focus` events to automatically re-sync container statuses, image lists, and system resource monitors when switching back to the app.
- **Action Debounce & Loading Spinners**: Added immediate visual spinners to Start, Stop, Restart, and Delete buttons to prevent accidental double-clicks.
- **Global <kbd>Esc</kbd> Dismissal**: Pressing <kbd>Esc</kbd> now smoothly dismisses all open modals across the entire app.

#### 🔄 Streamlined Auto-Updater
- **Automatic Package Selection**: The in-app updater automatically uses the native package matching your installation (`.deb`, `.rpm`, `.exe`, or `.tar.gz`) without prompting manual selection.
- **Clear Elevation Indicator**: Transparently indicates when Polkit root authorization is needed for `.deb` and `.rpm` system upgrades.

#### 🧹 Visual Disk Space & Prune Dashboard Refinements
- **Refined Reclaimable Space Card**: Replaced dark gradient background with a luminous mint-teal surface (`#ecfdf5`), bold emerald numbers (`#047857`), high-contrast subtitles, and a crisp progress bar track.
- **Enhanced Button & Badge Contrast**: Styled Quick Clean button, category icons (Images, Volumes, Containers, Build Cache), and alert banners for WCAG-compliant readability in Light Mode.
- **Improved Modal Overlays & State UX**: Calibrated backdrop dimming, option hover states, and added dedicated error retry & empty-state indicators.

#### 📜 Open-Source License & Attribution
- **Apache-2.0 Badge in Settings**: Direct link to the Apache 2.0 license and source repository (`Amanbig/dockit`) in the About Dockit section.
- **Clean Product Description**: Replaced internal build toolchain text with a clean, user-focused overview.

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

---

# Dockit v0.6.1 🚀

Dockit **v0.6.1** brings refined **Light Mode contrast and aesthetics** across the Disk & Cleanup dashboard, transparent **Apache 2.0 open-source licensing and repository attribution** in the Settings view, and minor visual polish.

---

### ✨ What's New & Highlights

#### ☀️ Light Mode Visual & Contrast Refinements
- **Refined Reclaimable Space Card**: Replaced dark gradient background with a clean mint-teal surface, bold emerald numbers, high-contrast subtitles, and crisp progress bar track.
- **Enhanced Button & Badge Styling**: Styled Quick Clean button, category icons (Images, Volumes, Containers, Build Cache), and alert banners for WCAG-compliant readability in Light Mode.
- **Improved Modal Overlays**: Calibrated backdrop dimming and option hover states for consistent focus across themes.

#### 📜 Open-Source License & Attribution
- **Apache-2.0 Badge in Settings**: Direct link to the Apache 2.0 license and source repository (`Amanbig/dockit`) in the About Dockit section.

---

# Dockit v0.6.0 🚀

Dockit **v0.6.0** introduces a brand-new **Visual Disk Space & Prune Dashboard** with 1-click storage reclamation, a **Package-Aware Auto-Updater** with native PolicyKit (`pkexec`) root authorization for `.deb` and `.rpm` installations, and resolved **WebKitGTK 2.42+ / NVIDIA driver compatibility** on Linux Mint & Ubuntu!

---

### ✨ What's New & Highlights

#### 🧹 Visual Disk Space & Prune Dashboard ("Reclaim Storage")
- **Comprehensive Storage Breakdown**:
  - Live breakdown of disk space consumed by **Images**, **Containers**, **Volumes**, and **Build Cache**.
  - Highlights **Reclaimable Space** with a visual percentage gauge so you instantly see how much storage can be safely freed.
- **1-Click Quick Clean**:
  - Safely purges stopped container layers, dangling images, and build cache in a single tap without impacting running workloads.
- **Selective Prune & Custom Cleanup**:
  - Prune stopped containers only.
  - Prune dangling untagged images or all unused images.
  - Prune anonymous and unattached volumes.
  - Prune build cache records.
  - Prune unused virtual networks.
- **Interactive Results Banner**:
  - Live loading indicator during pruning.
  - Displays a summary banner showing exact space reclaimed (e.g. `Successfully Reclaimed 2.67 GB!`) along with item counts.
- **First-Class Navigation**:
  - Added dedicated **Disk & Cleanup** item in the sidebar navigation and `Ctrl+K` Command Palette.

#### 📦 Package-Aware Auto-Updater with Root Elevation Support
- **Native Package Detection**:
  - Automatically identifies whether Dockit was installed via `.deb` (Debian, Ubuntu, Mint), `.rpm` (Fedora, RHEL), or standalone portable binary.
- **Root Elevation via PolicyKit (`pkexec`)**:
  - When installed to system locations like `/usr/bin/dockit`, the updater downloads the appropriate `.deb` or `.rpm` package and requests system authorization via a native desktop password prompt.
  - Resolves previous `system denied / permission denied` errors during in-app updates.
  - Graceful fallback to GUI package managers (GDebi / Software Manager via `xdg-open`).
- **Multi-Asset Package Selector**:
  - Update modal lists all available package formats for your OS, allowing you to select between `.deb`, `.rpm`, or `.tar.gz` with detected defaults.

#### 🐧 WebKitGTK 2.42+ & NVIDIA Linux Compatibility
- **Fixed DMA-BUF / GBM Driver Failure**:
  - Set `WEBKIT_DISABLE_DMABUF_RENDERER=1` and `WebviewGpuPolicyOnDemand` in application initialization.
  - Completely fixes `KMS: DRM_IOCTL_MODE_CREATE_DUMB failed: Permission denied` and blank/crashed windows on NVIDIA GPUs (e.g. GeForce GT 730) on Linux Mint and Ubuntu.
  - Launcher desktop entries automatically inherit the required environment variables.

---

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
