# Dockit v0.7.0 🚀

Dockit **v0.7.0** introduces a complete overhaul of the **Registry Hub** (featuring a full-page responsive search grid and dedicated full-screen image documentation viewer), **Tab Keep-Alive & Seamless Navigation State Retention** across all workspace views (Compose, Registry, Containers, Images), a comprehensive **Container Execution & Runtime Inspector Dialog** with clean timestamp formatting, and interactive **Port Bindings** and **Command Override** dialogs with live Docker argument tokenization and 1-click popular development presets.

---

### ✨ What's New & Highlights

#### 🔍 Full-Page Registry Hub & Dedicated Image Documentation Viewer
- **Full-Page Search Grid**: Replaced the cramped 2-column split layout with a spacious, full-width responsive card grid (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`) displaying repository stars, pull counts, official badges, and descriptions across the entire viewport.
- **Dedicated Image Documentation Workspace**: Clicking any repository smoothly transitions to a full-viewport dedicated view featuring a top navigation bar with a 1-click "← Back to Search Results" button and breadcrumb path (`Registry Hub / <image>`).
- **Complete Markdown & Tag Viewing**: Documentation READMEs, run commands, and architecture/tag tables now utilize the full application width without horizontal crowding or truncated tables.
- **Header Cleanliness**: The main search bar and header are cleanly hidden while exploring an image's details, maximizing vertical reading space.
- **Quick Search Suggestions**: Added 1-click search suggestion chips (Nginx, Node, Python, Redis, Postgres, Ubuntu, Alpine, Golang) on empty search state for rapid exploration.

#### 🗂️ Tab Keep-Alive & Seamless Navigation State Retention
- **No More Resetting on Tab Switch**: Navigating between sidebar tabs (e.g. from Registry Hub to Compose Projects, Containers, or Settings) no longer destroys component trees or wipes working progress.
- **Persistent State Across Views**:
  - **Registry Hub**: Preserves active search queries, search results, selected image documentation view, scroll positions, and open tag browsers.
  - **Compose Studio**: Keeps opened compose projects, unstaged/staged YAML edits, `.env` configurations, and terminal execution streams active.
  - **Containers & Images**: Retains search filters, multi-select batch checkboxes, and active container inspection details.
- **Lazy Mounting with Instant Switching**: Views are mounted lazily upon first visit for rapid application launch, and then maintained with zero-lag CSS visibility toggles (0ms switching with zero flicker).

#### ⚡ App Memory Management & Lightweight Resource Utilization
- **Visibility-Aware Smart Polling**: Background polling for containers, host hardware metrics, live resource stats, and log streams automatically suspends whenever Dockit is minimized or placed in the background (`document.hidden`), eliminating idle CPU cycles and memory churn.
- **Tab-Aware Interval Throttling**: Container resource stats (CPU/RAM/IO) and log polling immediately suspend when navigating away to other tabs, resuming instantly upon returning.
- **Log Buffer Memory Guardrails**: Capped container log queries to `Tail: 2500` in the engine and bounded React in-memory log state to 500,000 characters, preventing DOM bloat and out-of-memory spikes on heavy logging containers.
- **Proactive Go Runtime Memory Scavenging**:
  - Configured `debug.SetGCPercent(50)` for more frequent garbage collection and a compact heap footprint.
  - Set a 256MB soft memory limit (`debug.SetMemoryLimit`) to prevent uncontrolled heap expansion.
  - Added a periodic idle OS memory scavenger calling `debug.FreeOSMemory()` to proactively return unused heap pages back to the OS (`MADV_DONTNEED`).
- **Modular Rollup Code-Splitting**: Configured manual vendor chunks (`vendor-react`, `vendor-marked`, `vendor-icons`), eliminating monolithic bundle warnings, accelerating WebKit compilation, and reducing initial JavaScript VM heap allocation.

#### ⏱️ Container Execution Details & Runtime Inspector Dialog
- **Clean Timestamp Formatting & Overflow Prevention**: Replaced raw, overflowing ISO timestamps (`2026-08-29T14:51:11.244946742Z`) in the Execution Details card with clean `YYYY-MM-DD HH:mm:ss` timestamps, full-width row alignment (`justify-between`), and complete raw timestamps in hover tooltips.
- **Dedicated "Expand" Modal (<kbd>Maximize2</kbd>)**: Added an Expand button on the Execution Details card that opens a comprehensive inspection dialog showcasing:
  - Container State, PID, Exit Code, OOMKilled flag, and Active/Total Duration uptime.
  - Image ID, Architecture, Platform, and full Startup Command breakdown.
  - Network Configuration (IP, Gateway, MAC address, Ports) and Mounts/Volumes.
  - 1-Click Copy actions for individual fields and full raw JSON container payload.

#### 🌐 Interactive Port Bindings Dialog with 1-Click Presets
- **Visual Port Mapping Table**: Manage host-to-container port forwards (`host_port:container_port`) with protocol selection (`TCP` / `UDP`) and keyboard navigation (<kbd>Enter</kbd> on container port adds a new row).
- **1-Click Popular Presets**: Instant one-click port presets for standard development services (HTTP `80:80`, HTTPS `443:443`, Node/React `3000:3000`, Web `8080:8080`, Vite `5173:5173`, PostgreSQL `5432:5432`, MySQL `3306:3306`, Redis `6379:6379`).
- **Quick String Mode**: Paste or edit multi-port strings (e.g. `8080:80, 443:443/udp, 127.0.0.1:3000:3000`) with two-way synchronization.
- **Form Preview & Quick Clear**: Clean preview chips showing active port mappings with one-click Clear and Edit actions.

#### ⌨️ Command Override (CMD) Dialog & Live Argument Tokenizer
- **Dedicated Command Editor**: Spacious multi-line script editor for overriding container startup commands or entrypoints.
- **Live Docker Argument Tokenizer**: Real-time visual breakdown displaying exact parsed arguments `[0]`, `[1]`, `[2]` with shell quote preservation (`"..."` and `'...'`), preventing argument mangling.
- **Convenient Command Snippets**: Built-in 1-tap snippets for container debugging: Keep-Alive (`sleep infinity`, `tail -f /dev/null`), interactive shells (`/bin/sh`, `/bin/bash`), and inline shell wrappers (`sh -c "..."`).

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
