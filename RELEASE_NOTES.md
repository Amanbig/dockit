# Dockit v0.4.0 🚀

Dockit **v0.4.0** is a major release featuring **Native Platform Installers** (`.deb`, `.rpm`, `.exe`, `.dmg`), a global **`Ctrl+K` / `Cmd+K` Command Palette**, and full **`.env` Environment Variable Support** in Compose Studio!

---

### ✨ What's New

#### 💿 Native Installers & Enhanced Distribution
- **Linux (`.deb` & `.rpm`)**:
  - Native Debian/Ubuntu/Mint installer package (`dockit-linux-amd64.deb`).
  - Native Fedora/RHEL/openSUSE installer package (`dockit-linux-amd64.rpm`).
  - Automatically installs desktop launcher, application categories, and 512x512 icons into system paths (`/usr/share/applications`, `/usr/share/icons`).
  - Standalone portable archive (`dockit-linux-amd64.tar.gz`) remains available for all Linux distributions.
- **Windows (`.exe` NSIS Installer)**:
  - Added Windows setup wizard installer (`dockit-windows-amd64-installer.exe`) built via NSIS.
  - Automatically creates Start Menu and Desktop shortcuts, associates runtime dependencies, and provides a clean Control Panel uninstaller.
  - Standalone zipped portable binary (`dockit-windows-amd64.zip`) is also provided.
- **macOS (`.dmg` Apple Disk Image)**:
  - Packaged disk image (`dockit-darwin-universal.dmg`) with standard drag-and-drop to Applications folder for both Apple Silicon (M1/M2/M3/M4) and Intel Macs.
  - Standalone zipped `.app` bundle (`dockit-darwin-universal.zip`) also included.

#### ⌨️ Global Command Palette (`Ctrl+K` / `Cmd+K`)
- **Instant Search & Jump**: Press `Ctrl+K` (or `Cmd+K` on Mac), or click the search bar in the header to search anything in Dockit:
  - **Quick Navigation**: Jump instantly to Containers, Images, Volumes, Networks, Compose Studio, Registry Hub, or Settings.
  - **Live Container Search & Control**: Search containers by name, image, or ID. Start, stop, view live logs, or inspect containers directly from the palette.
  - **Images & Volumes**: Quickly find and inspect images and persistent volumes.
  - **System & Engine Actions**: Switch between Docker and Podman, toggle Dark/Light mode, prune unused volumes, refresh resources, and check for updates without touching the mouse.
  - **Full Keyboard Navigation**: Arrow keys (`↑` / `↓`), `Enter` to select, and `Esc` to close.

#### 🛠️ Compose Studio `.env` Editor
- **Integrated Environment Management**: Added a dedicated **"Environment (.env)"** tab to Compose Studio.
- **In-Place Sync & Safety**: Edit project environment variables directly in Dockit with unsaved changes detection, disk sync status, and discard capabilities.
- **Quick-Start Templates**: One-click template generator with sensible defaults for common server configurations, database ports, credentials, and app secrets.
- **Seamless Engine Integration**: Variables defined in `.env` are automatically consumed by Docker and Podman when launching or testing Compose services.

---

### 📦 Artifacts Included
- **Linux**:
  - `dockit-linux-amd64.deb` (Debian, Ubuntu, Linux Mint, Pop!_OS)
  - `dockit-linux-amd64.rpm` (Fedora, RHEL, CentOS, openSUSE)
  - `dockit-linux-amd64.tar.gz` (Portable Linux tarball)
- **Windows**:
  - `dockit-windows-amd64-installer.exe` (NSIS Setup Wizard)
  - `dockit-windows-amd64.zip` (Portable executable)
- **macOS**:
  - `dockit-darwin-universal.dmg` (Drag-and-Drop Disk Image)
  - `dockit-darwin-universal.zip` (Universal application bundle)
