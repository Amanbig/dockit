# Dockit v0.6.1 🚀

Dockit **v0.6.1** brings refined **Light Mode contrast and aesthetics** across the Disk & Cleanup dashboard, transparent **Apache 2.0 open-source licensing and repository attribution** in the Settings view, auto-detected packaging in the in-app updater, and reliability improvements.

---

### ✨ What's New & Highlights

#### 🧹 Visual Disk Space & Prune Dashboard Refinements
- **Refined Reclaimable Space Card**: Replaced dark gradient background with a luminous mint-teal surface (`#ecfdf5`), bold emerald numbers (`#047857`), high-contrast subtitles, and a crisp progress bar track.
- **Enhanced Button & Badge Contrast**: Styled Quick Clean button, category icons (Images, Volumes, Containers, Build Cache), and alert banners for WCAG-compliant readability in Light Mode.
- **Improved Modal Overlays & State UX**: Calibrated backdrop dimming, option hover states, and added dedicated error retry & empty-state indicators.

#### 🔄 Streamlined Auto-Updater
- **Automatic Package Selection**: The in-app updater automatically uses the native package matching your installation (`.deb`, `.rpm`, `.exe`, or `.tar.gz`) without prompting manual selection.
- **Clear Elevation Indicator**: Transparently indicates when Polkit root authorization is needed for `.deb` and `.rpm` system upgrades.

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
