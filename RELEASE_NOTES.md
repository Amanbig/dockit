# Dockit v0.6.5 🚀

Dockit **v0.6.5** brings multi-select checkboxes and 1-click batch actions across Containers, Images, and Volumes, an **Interactive Environment Variables Manager** (with visual Key-Value table, Raw `.env` mode, and 1-click file upload), a major upgrade to **Container Logs** with interactive search match navigation arrows (`▲` / `▼`), active highlight focusing, and auto-scrolling to latest logs. It also introduces a robust **Reliability & Error Handling Architecture** (replacing native alerts with floating toast notifications and in-app confirm dialogs), automatic native package selection in the **In-App Updater**, and refined **Disk Space & Prune Dashboard** visuals.

---

### ✨ What's New & Highlights

#### ⚙️ Interactive Environment Variables Manager & `.env` Importer
- **Visual Key-Value Table Editor**: Dedicated table interface to add, edit, and delete environment variables with monospace styling and keyboard support (<kbd>Enter</kbd> on the last value input automatically creates and focuses a new row).
- **Direct Raw `.env` Syntax Mode**: Full monospace text editor tab supporting standard `.env` syntax (`KEY=VALUE`), ignoring comments (`#`) and blank lines, with seamless two-way synchronization between Table and Raw modes.
- **1-Click `.env` File Upload**: Dedicated "Import .env" button to load local `.env` and `.txt` files directly into the container configuration with automatic parsing and variable merging.
- **Form Preview & Overflow Protection**: Replaced the plain single text field in the Create Container modal with an interactive card trigger featuring live variable counts (`X set`), preview chips with truncation tooltips for long keys/values, and a clean `+N more` counter for large variable sets.
- **Engine Support**: Transparently handles arrays, multiline `.env` strings, and legacy comma-delimited strings on container creation.

#### 📜 Container Logs Search Navigation & Auto-Scroll
- **Interactive Find in Logs (`▲` / `▼`)**: Dedicated Previous Match (`▲` / <kbd>Shift+Enter</kbd>) and Next Match (`▼` / <kbd>Enter</kbd>) navigation buttons jump directly from match to match and smoothly center the log viewport on the selected occurrence.
- **Dynamic Active Match Highlighting & Live Counter**: Selected match receives an active cyan focus ring, extra bold typography, and subtle pop (`ring-2 ring-cyan-400 font-black scale-105`) while other occurrences remain highlighted in soft yellow. Features a real-time match counter (e.g. `1/14` or `0/0`).
- **Flexible Filter vs All Lines Toggle**: Easily switch between **All Lines** (keeping full surrounding log context with active navigation) and **Filtered** mode (isolating only lines containing matches).
- **Auto-Scroll to Bottom on Open**: Opening the container details **Live Logs** tab or the standalone **Logs Modal** now automatically scrolls directly to the newest log entries at the bottom instead of staying anchored at line 1.
- **Streamlined Tab Height (380px) & Maximize Dialog**: Compacted the Live Logs container height to `380px` to prevent page overflow on smaller/scaled displays, and added a Maximize button (<kbd>Maximize2</kbd>) to instantly pop the logs into a spacious dialog.
- **Full-Screen Modal Dialog Mode**: The standalone Logs Modal now includes a Full Screen toggle button (<kbd>Maximize2</kbd> / <kbd>Minimize2</kbd>) that expands the modal to 98vw/95vh for intensive log inspection.
- **Dedicated "Scroll to Bottom" Actions**: Added 1-click scroll-to-bottom buttons with auto-tail synchronization across both the details view and the logs modal.

#### ☑️ Multi-Select Checkboxes & Batch Operations
- **Row & Header Checkboxes**: Added selection checkboxes across **Containers**, **Images**, and **Storage Volumes** tables with master Select All/Deselect All and indeterminate (`-`) state handling.
- **Batch Action Toolbar**: When one or more items are selected, a sleek floating batch actions bar appears with selected count and 1-click batch controls:
  - **Containers**: Batch Start, Batch Stop, Batch Restart, and Batch Delete.
  - **Images**: Batch Delete with safe confirmation prompt.
  - **Volumes**: Batch Delete with safe confirmation prompt.
- **Safe Single-Prompt Batch Confirmations**: Destructive batch actions trigger a single consolidated confirmation modal detailing the exact number of resources about to be deleted.
- **Visual Selected Highlighting**: Selected rows receive an active cyan accent highlight (`bg-cyan-950/30 border-l-2 border-l-cyan-400`) and stop-propagation click handling.

#### 🔔 Modern Toast Notification System & Engine Error Parsing
- **Non-Blocking Toasts**: Replaced all native browser `alert()` popups with sleek, animated toast notifications for success, warnings, info, and errors with auto-dismiss.
- **Human-Readable Engine Errors**: Raw Docker/Podman socket errors (e.g. `context deadline exceeded`, `No such container`, `permission denied`, `port is already allocated`) are parsed into clean, helpful guidance with one-click error copying.

#### 🛡️ In-App Confirmation Dialogs (<kbd>Enter</kbd> / <kbd>Esc</kbd>)
- **No More Native Prompts**: Replaced all blocking `window.confirm()` calls with a polished in-app confirmation modal.
- **Keyboard-Accessible**: Press <kbd>Enter</kbd> to confirm or <kbd>Esc</kbd> to cancel actions safely.
- **Danger Visuals**: Destructive actions (container deletion, volume removal, system pruning) are clearly highlighted with red warning icons and danger button styles.

#### 🛡️ Application Reliability, Error Boundaries & Timeouts
- **React Error Boundaries**: Added top-level and per-view error boundaries to gracefully catch rendering issues and offer a 1-click view reload instead of crashing to a blank white screen.
- **Defensive Backend Timeouts**: Bound all Go backend RPC methods with defensive 15-second context timeouts (`getContext(15 * time.Second)`) to prevent UI lockups if an engine socket hangs.
- **Window Focus Auto-Sync**: Dockit now listens for window `focus` events to automatically re-sync container statuses, image lists, and system resource monitors when switching back to the app.
- **Action Debounce & Loading Spinners**: Added immediate visual spinners to Start, Stop, Restart, and Delete buttons to prevent accidental double-clicks.
- **Global <kbd>Esc</kbd> Dismissal**: Pressing <kbd>Esc</kbd> smoothly dismisses all open modals across the entire app.

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
