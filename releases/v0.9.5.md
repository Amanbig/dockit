# Dockit v0.9.5 🛡️

Dockit **v0.9.5** delivers essential security patches, upstream dependency updates, Vite bundler chunking enhancements, and Snap package maintenance against the latest Ubuntu security updates.

---

### ✨ What's New & Highlights

#### 🛡️ Snap Packaging & Ubuntu Security Notice (USN 8975-1)
- **Ubuntu Security Patch Alignment**: Rebuilt and staged snap package against the latest Ubuntu 24.04 (core24) archive, incorporating security patch **USN 8975-1** for `libsoup-3.0-common` used by `libwebkit2gtk-4.1-0`.
- **Snapcraft Version Bump**: Updated snapcraft build metadata and packaging definitions to `v0.9.5`.

#### ⚡ Bundler & Chunking Architecture Polish
- **Dynamic Functional `manualChunks`**: Modernized Rollup/Vite chunk configuration in `vite.config.js` to use functional chunk mapping (`manualChunks(id)`).
- **Clean Vendor Separation**: Ensures optimized client delivery across `vendor-react`, `vendor-icons`, `vendor-marked`, and `vendor-xterm`, eliminating module bundling warnings and guaranteeing full forward-compatibility with Vite / Rolldown bundlers.

#### 📦 Upstream Dependabot & Dependency Upgrades
- **Lucide Icons**: Bumped `lucide-react` to `1.70.0` (resolves Dependabot PR #22).
- **TypeScript Node Definitions**: Bumped `@types/node` to `26.6.6` (resolves Dependabot PR #21).
- **Classnames / Utilities**: Bumped `cn` to `0.5.2` (resolves Dependabot PR #20).
- **UI & Icons**: Bumped `@hugeicons/core-free-icons` to `4.4.0` and `shadcn` to `4.23.0`.
- **Styling**: Bumped `@tailwindcss/vite` and `tailwindcss` to `4.3.4`.
- **Markdown Parser**: Bumped `marked` to `18.1.3`.
- **Security Vulnerability Remediation**: Resolved upstream advisories across `zod`, `fast-uri`, `body-parser`, `qs`, and `systeminformation`.

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
