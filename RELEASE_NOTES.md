# Dockit v0.3.2 🚀

Dockit **v0.3.2** delivers the complete in-place background self-updater (VS Code-style), smooth atomic application restart, real-time container resource monitoring (CPU, Memory, Network & Disk I/O), full Light Mode UI polish, and automated release note generation.

---

### ✨ What's New

#### 🔄 In-Place Background Self-Update & Instant Restart
- **Automatic GitHub Release Detection**: Dockit automatically checks for newer releases and identifies the exact binary package matching your host operating system and CPU architecture.
- **Background Download with Live Progress**: Downloads update archives in the background with real-time percentage and byte tracking without interrupting your work.
- **In-Place Atomic Replacement**: Extracts and safely updates the running executable in-place across Linux, Windows, and macOS.
- **One-Click Restart**: Added a **"Restart Now"** action to immediately launch the newly installed version.
- **Non-Intrusive Floating Toast**: Replaced blocking startup alerts with a floating update banner in the bottom-right corner with *"View Update"* and *"Later"* options.
- **Automatic Check Preferences**: Added a toggle in **Settings & Setup** to enable or disable automatic startup update checks.

#### 📊 Real-Time Container Resource Metrics
- **Live Performance Dashboard**: Inspect active container resource consumption directly from the Container Overview tab:
  - **CPU Usage %**: Calculated in real-time across all online CPU cores with a live visual progress bar.
  - **Memory Usage**: Resident memory usage with cache deduction, total container memory limits, and percentage gauges.
  - **Network I/O**: Live incoming (Rx) and outgoing (Tx) network throughput.
  - **Disk & Tasks**: Total block I/O bytes read/written and active OS process/thread counts (PIDs).
- **Smooth Auto-Polling**: Metrics stream every 2 seconds while the container is running and pause cleanly when stopped.

#### 📜 Container Log Explorer & Filtering
- **Interactive Log Filtering**: Quick search with real-time text matching across log streams.
- **Log Level Badges**: Filter logs instantly by level (`All`, `Error`, `Warn`, `Info`).
- **Timestamp Toggle**: Show or hide ISO timestamps on demand.
- **Smart Auto-Follow**: Auto-scrolls to the newest log entries as they arrive.
- **Match Counter**: Live counter showing filtered vs. total lines.

#### 🎨 Theme & UI Enhancements
- Fixed Light Mode styling for the Compose Down options dialog, Update modal, release notes box, and version indicator pills.

#### 🐧 Modern Linux Distro Support
- **Ubuntu 24.04 (Noble) & Linux Mint 22+ Compatibility**: Updated build toolchain and CI release workflows to compile with WebKitGTK 4.1 (`-tags webkit2_41`).

---

### 📦 Artifacts Included
- **Linux (`amd64`)**: `dockit-linux-amd64.tar.gz`
- **Windows (`amd64`)**: `dockit-windows-amd64.zip`
- **macOS (`universal`)**: `dockit-darwin-universal.zip`
