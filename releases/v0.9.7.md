# Dockit v0.9.7 ⚡

Dockit **v0.9.7** introduces a dedicated **Developer Keyboard Shortcuts Cheatsheet Modal**, **Quick-Copy Actions** on container rows, and upgrades key container runtime and frontend dependencies (`moby/client` v0.6.3, `moby/api` v1.57.0, `@vitejs/plugin-react` v6.3.0, `lucide-react` v1.78.0, and `tailwind-merge` v3.7.1).

---

### ✨ What's New & Highlights

#### ⌨️ Developer Keyboard Shortcuts & Cheatsheet Modal
- **Instant Shortcuts Modal (`?` or `Shift+/`)**: Press <kbd>?</kbd> anywhere (outside inputs) or click the new **Help icon** in the header to open a comprehensive shortcut cheatsheet.
- **Categorized Shortcuts**: Grouped into *Global & Navigation*, *Bottom Terminal Drawer*, and *Resource Workflows & Quick Actions*, complete with platform-aware key hints (<kbd>Ctrl</kbd> on Linux/Windows, <kbd>⌘</kbd> on macOS).
- **Fuzzy Search Filter**: Quickly find shortcuts for terminal tabs, clearing screens, searching, and managing resources.
- **Settings Integration**: Dedicated shortcut button in **Settings → About** for quick reference.

#### 📋 Quick-Copy on Container Rows
- **1-Click Container ID Copy**: Hover over any container row in the main container table to instantly copy the full container ID to your clipboard.
- **1-Click Image Tag Copy**: Hover over container image tags to copy the exact image name for fast terminal commands.

#### 📦 Upstream Dependabot & Ecosystem Upgrades
- **Docker/Moby Client**: Upgraded `github.com/moby/moby/client` from `0.6.2` to `0.6.3` (resolves #36).
- **Docker/Moby API**: Upgraded `github.com/moby/moby/api` from `1.56.1` to `1.57.0` (resolves #35).
- **Vite React Plugin**: Upgraded `@vitejs/plugin-react` from `5.2.0` to `6.3.0` (resolves #33).
- **Lucide Icons**: Bumped `lucide-react` from `1.72.0` to `1.78.0` (resolves #34).
- **Markdown Renderer**: Bumped `marked` from `18.2.0` to `18.2.1` (resolves #37).
- **Tailwind Merge**: Bumped `tailwind-merge` from `3.7.0` to `3.7.1` (resolves #38).

#### 🛡️ Snap Packaging Security Maintenance
- Bumped snapcraft version configuration to `v0.9.7` for clean automated build & publish on Launchpad / Snapcraft online builds.

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
