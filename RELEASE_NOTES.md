# Dockit v0.9.6 🚀

Dockit **v0.9.6** upgrades the core frontend and desktop runtime dependencies (Vite 8, Wails v2.17.1, Lucide Icons), introduces automated GitHub Discussions release announcements, and modernizes Vite configuration for native ESM compatibility.

---

### ✨ What's New & Highlights

#### 📢 Automated GitHub Discussions Release Announcements
- **Release Discussions Integration**: GitHub Releases are now automatically cross-posted to the repository's GitHub Discussions **Announcements** category upon publishing.
- **Community Engagement**: Community members can now easily discuss new features, provide direct feedback, and ask release-specific questions right from Discussions.

#### ⚡ Core Toolchain & Bundler Upgrades
- **Vite 8 (`^8.3.8`)**: Upgraded to the latest Vite 8 engine, delivering blazing-fast sub-second production build times (~600ms).
- **Native ESM Config (`import.meta.dirname`)**: Transitioned `vite.config.js` to use `import.meta.dirname` for native ESM compatibility.
- **Wails Desktop Framework (`v2.17.1`)**: Upgraded core Go application framework to `v2.17.1` for improved runtime stability and security fixes.

#### 📦 Ecosystem & Dependency Updates
- **Wails Go Module**: Upgraded `github.com/wailsapp/wails/v2` from `2.17.0` to `2.17.1` (resolves Dependabot PR #24).
- **Vite Bundler**: Upgraded `vite` from `7.3.7` to `8.3.8` (resolves Dependabot PR #25).
- **Lucide Icons**: Bumped `lucide-react` to `1.72.0`.
- **Markdown Rendering**: Bumped `marked` to `18.2.0`.
- **Tailwind CSS**: Bumped `@tailwindcss/vite` and `tailwindcss` to `4.3.5`.
- **Go Ecosystem**: Upgraded `golang.org/x/net`, `golang.org/x/crypto`, `golang.org/x/sys`, and `github.com/labstack/echo/v4`.

#### 🛡️ Snap Packaging Security Maintenance
- Rebuilding against the latest Ubuntu 24.04 (core24) archive incorporates all recent security fixes from the Ubuntu Security Notices (USN) scanner.
- Bumped snapcraft build configuration to `v0.9.6` and Wails CLI to `v2.17.1`.

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
