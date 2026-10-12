# Dockit 🐳 🦭

> A modern, fast, cross-platform desktop container management application supporting **Docker** and **Podman** simultaneously with unified abstractions, staged Compose testing, multi-registry exploration, and built-in runtime detection & installation.

Built with **Go (Wails v2)** + **React 19** + **Tailwind CSS v4** + **Base UI / Shadcn**.

---

## ✨ Features

### 🔄 Unified Docker & Podman Engine Abstraction
- Seamlessly switch between **Docker** and **Podman** at runtime with a single click.
- Automatic detection of standard sockets, user rootless sockets (`/run/user/$UID/podman/podman.sock`), rootful sockets, and Windows named pipes (`//./pipe/docker_engine`).
- Custom socket endpoint overrides supported via persistent configuration.

### 📦 Containers Management
- View, start, stop, restart, pause, unpause, and delete containers.
- Real-time container status badges, port bindings, and created timestamps.
- **Log Streaming & Inspection**: Live container logs with auto-scroll and quick clipboard copy.
- **Inspect Inspector**: Deep JSON inspection of low-level container configurations and network settings.
- **Create Container Wizard**: Interactive dialog to spin up containers with port mappings, environment variables, and command overrides.

### 🖼️ Images & Local Cache
- List local images with repository tags, IDs, and human-readable sizes.
- Pull images from any public or private registry directly from the UI.
- Tag and inspect local image layers.
- Delete and prune unused images safely.

### 💾 Persistent Volumes & 🌐 Virtual Networks
- **Volumes**: Manage persistent storage volumes, inspect mount points, create new local volumes, and prune dangling volumes.
- **Networks**: Inspect virtual bridges, host networks, overlays, and custom internal networks with IPAM subnet information.

### 🧪 Docker Compose & Staged Testing Studio
- **Local & Git Projects**: Open any local folder containing a `docker-compose.yml` or clone one directly from a Git URL.
- **Visual Service Cards**: Monitor service definitions, mapped ports, and volumes with individual service start/stop/restart controls.
- **Staged Testing Sandbox**: 
  - Edit your compose YAML directly in the built-in monospace editor.
  - **Stage Changes in Memory**: Test-run tweaks in an isolated sandbox *without* overwriting the file on disk.
  - **Apply or Discard**: Once verified, atomically commit the changes to disk or discard them back to the original file.

### 🌍 Unified Registry Hub
- Multi-registry search across **Docker Hub** and **GitHub Container Registry (GHCR)**.
- Filter by official images, view star counts, pull counts, and descriptions.
- Inspect published tags with layer sizes.
- One-click image pulling and favorites bookmarking.

### 🛠️ Runtime Detection & Engine Installer
- Cross-platform detection for Docker and Podman daemon states.
- Automated installation plans explaining prerequisites, package managers (APT, DNF, Pacman, Homebrew, Winget, Chocolatey), and privilege explanations (why `sudo` or admin is required).
- One-click trigger to install and configure container runtimes if not already present.

---

## 🏗️ Architecture

```
dockit/
├── app.go                      # Wails RPC backend bridge binding internal domains
├── main.go                     # Wails application entrypoint & window configuration
├── internal/
│   ├── runtime/                # Unified runtime abstraction
│   │   ├── runtime.go          # Runtime interface
│   │   ├── engine/             # Shared moby client implementation (containers, images, etc.)
│   │   ├── docker/             # Docker socket client connector
│   │   └── podman/             # Podman rootless/rootful socket auto-detector
│   ├── containers/             # Container lifecycle domain service
│   ├── images/                 # Image management domain service
│   ├── volumes/                # Volume domain service
│   ├── networks/               # Network domain service
│   ├── compose/                # Project parser, staged sandbox manager & CLI runner
│   ├── registry/               # Docker Hub & GHCR search/metadata clients
│   ├── config/                 # App local storage & user preferences manager (atomic JSON)
│   └── installer/              # Safe detection, authorization explanation, & OS installers
│       ├── linux/              # apt, dnf, pacman, zypper
│       ├── macos/              # brew, colima, docker desktop
│       └── windows/            # winget, choco
└── frontend/                   # React 19 + Tailwind v4 + Base UI
    ├── src/
    │   ├── components/         # Views: Containers, Images, Volumes, Networks, Compose, Registry, Settings, Modals
    │   ├── lib/utils.js        # Class merging utilities
    │   ├── App.jsx             # Main dashboard coordinator
    │   └── main.jsx
    └── wailsjs/                # Auto-generated RPC bindings between Go and JS
```

---

## 🚀 Getting Started

### Prerequisites
- **Go**: `1.22+`
- **Node.js**: `18+` & `npm`
- **Wails CLI**: `v2.9+` (`go install github.com/wailsapp/wails/v2/cmd/wails@latest`)
- Either **Docker** (`docker engine` or `docker desktop`) or **Podman** installed (or install them directly via Dockit's built-in installer!).

### Installation & Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/dockit.git
   cd dockit
   ```

2. **Install frontend dependencies**:
   ```bash
   cd frontend
   npm install
   cd ..
   ```

3. **Run in Live Development Mode**:
   ```bash
   wails dev
   ```
   This spins up Vite with hot-reloading for the React UI and binds your Go methods in real time.

4. **Run Unit Tests**:
   ```bash
   go test ./...
   ```

---

## 📦 Production Build

To compile a self-contained desktop binary for your current operating system:

```bash
wails build
```

The compiled binary will be placed inside the `build/bin/` directory.

### Target Platforms
- **Linux**: Standard binary / `.deb` / `.rpm`
- **macOS**: `.app` bundle / `.dmg`
- **Windows**: `.exe` executable / MSI installer

---