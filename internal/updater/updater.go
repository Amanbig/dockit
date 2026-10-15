package updater

import (
	"archive/tar"
	"archive/zip"
	"bytes"
	"compress/gzip"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"time"

	"dockit/internal/version"
	"github.com/minio/selfupdate"
)

const (
	githubOwner = "Amanbig"
	githubRepo  = "dockit"
)

// AssetOption represents an available asset in a release.
type AssetOption struct {
	Name        string `json:"name"`
	DownloadURL string `json:"downloadUrl"`
	Type        string `json:"type"` // "deb", "rpm", "tar.gz", "zip", "exe", "dmg"
	Size        int64  `json:"size"`
	IsDefault   bool   `json:"isDefault"`
}

// UpdateInfo holds details about the latest available release.
type UpdateInfo struct {
	Available       bool          `json:"available"`
	CurrentVersion  string        `json:"currentVersion"`
	LatestVersion   string        `json:"latestVersion"`
	ReleaseName     string        `json:"releaseName"`
	ReleaseNotes    string        `json:"releaseNotes"`
	PublishedAt     string        `json:"publishedAt"`
	ReleaseURL      string        `json:"releaseUrl"`
	DownloadURL     string        `json:"downloadUrl"`
	AssetFileName   string        `json:"assetFileName"`
	Platform        string        `json:"platform"`
	InstallType     string        `json:"installType"`     // "deb", "rpm", "standalone", "nsis", "portable", "dmg"
	NeedsElevation  bool          `json:"needsElevation"`  // true if writing to /usr/bin or using deb/rpm/nsis
	AvailableAssets []AssetOption `json:"availableAssets"` // all matching assets for this OS
}

// DownloadProgress represents the live status of an active update download.
type DownloadProgress struct {
	Percentage int    `json:"percentage"`
	TotalBytes int64  `json:"totalBytes"`
	ReadBytes  int64  `json:"readBytes"`
	Status     string `json:"status"` // "downloading", "extracting", "applying", "ready", "error"
	Error      string `json:"error,omitempty"`
}

type githubAsset struct {
	Name               string `json:"name"`
	BrowserDownloadURL string `json:"browser_download_url"`
	Size               int64  `json:"size"`
}

type githubRelease struct {
	TagName     string        `json:"tag_name"`
	Name        string        `json:"name"`
	Body        string        `json:"body"`
	HTMLURL     string        `json:"html_url"`
	PublishedAt string        `json:"published_at"`
	Prerelease  bool          `json:"prerelease"`
	Draft       bool          `json:"draft"`
	Assets      []githubAsset `json:"assets"`
}

var (
	progressMu sync.RWMutex
	curProgress = DownloadProgress{
		Status: "idle",
	}

	targetExecutableMu sync.RWMutex
	appExecutablePath  string
)

// GetCurrentProgress returns the latest download/install status.
func GetCurrentProgress() DownloadProgress {
	progressMu.RLock()
	defer progressMu.RUnlock()
	return curProgress
}

func setProgress(p DownloadProgress) {
	progressMu.Lock()
	curProgress = p
	progressMu.Unlock()
}

// DetectInstallationType detects how Dockit is installed on the host system.
func DetectInstallationType() string {
	if runtime.GOOS == "linux" {
		// 1. Check if dpkg manages dockit
		if _, err := exec.LookPath("dpkg"); err == nil {
			cmd := exec.Command("dpkg", "-s", "dockit")
			if err := cmd.Run(); err == nil {
				return "deb"
			}
		}
		// 2. Check if rpm manages dockit
		if _, err := exec.LookPath("rpm"); err == nil {
			cmd := exec.Command("rpm", "-q", "dockit")
			if err := cmd.Run(); err == nil {
				return "rpm"
			}
		}
		return "standalone"
	} else if runtime.GOOS == "windows" {
		execPath, err := os.Executable()
		if err == nil {
			lower := strings.ToLower(execPath)
			if strings.Contains(lower, "program files") {
				return "nsis"
			}
		}
		return "portable"
	} else if runtime.GOOS == "darwin" {
		execPath, err := os.Executable()
		if err == nil && strings.Contains(execPath, ".app/") {
			return "dmg"
		}
		return "portable"
	}
	return "standalone"
}

// isTargetWritable checks if the current process has write permissions to modify the binary or its directory.
func isTargetWritable(targetPath string) bool {
	dir := filepath.Dir(targetPath)
	testFile := filepath.Join(dir, fmt.Sprintf(".dockit_perm_check_%d_%d", os.Getpid(), time.Now().UnixNano()))
	f, err := os.OpenFile(testFile, os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return false
	}
	f.Close()
	_ = os.Remove(testFile)
	return true
}

// CheckForUpdate queries the GitHub Releases API for the latest release and compares it with the current running version.
func CheckForUpdate(ctx context.Context) (*UpdateInfo, error) {
	currentVer := version.Version
	installType := DetectInstallationType()

	targetExec, _ := os.Executable()
	if targetExec != "" {
		if realTarget, err := filepath.EvalSymlinks(targetExec); err == nil {
			targetExec = realTarget
		}
	}

	needsElevation := (installType == "deb" || installType == "rpm" || installType == "nsis" || (targetExec != "" && !isTargetWritable(targetExec)))

	info := &UpdateInfo{
		Available:      false,
		CurrentVersion: currentVer,
		LatestVersion:  currentVer,
		Platform:       fmt.Sprintf("%s/%s", runtime.GOOS, runtime.GOARCH),
		InstallType:    installType,
		NeedsElevation: needsElevation,
	}

	reqURL := fmt.Sprintf("https://api.github.com/repos/%s/%s/releases/latest", githubOwner, githubRepo)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return info, err
	}
	req.Header.Set("Accept", "application/vnd.github.v3+json")
	req.Header.Set("User-Agent", "Dockit-Desktop-Updater")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return info, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return info, nil
	}
	if resp.StatusCode != http.StatusOK {
		return info, fmt.Errorf("github api returned status %d", resp.StatusCode)
	}

	var rel githubRelease
	if err := json.NewDecoder(resp.Body).Decode(&rel); err != nil {
		return info, fmt.Errorf("failed to decode release json: %w", err)
	}

	info.LatestVersion = rel.TagName
	info.ReleaseName = rel.Name
	info.ReleaseNotes = rel.Body
	info.PublishedAt = rel.PublishedAt
	info.ReleaseURL = rel.HTMLURL

	assetName, downloadURL, availableAssets := matchAsset(rel.Assets, runtime.GOOS, runtime.GOARCH, installType)
	info.AssetFileName = assetName
	info.DownloadURL = downloadURL
	info.AvailableAssets = availableAssets
	if info.DownloadURL == "" {
		info.DownloadURL = rel.HTMLURL
	}

	if IsNewerVersion(rel.TagName, currentVer) {
		info.Available = true
	}

	return info, nil
}

// DownloadAndInstallUpdate downloads the matching archive, extracts the binary, and updates the executable in-place.
func DownloadAndInstallUpdate(ctx context.Context, downloadURL, assetFileName string) error {
	if downloadURL == "" {
		return errors.New("missing download url")
	}

	setProgress(DownloadProgress{
		Status:     "downloading",
		Percentage: 0,
	})

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, downloadURL, nil)
	if err != nil {
		setProgress(DownloadProgress{Status: "error", Error: err.Error()})
		return err
	}
	req.Header.Set("User-Agent", "Dockit-Desktop-Updater")

	client := &http.Client{Timeout: 5 * time.Minute}
	resp, err := client.Do(req)
	if err != nil {
		setProgress(DownloadProgress{Status: "error", Error: err.Error()})
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		err := fmt.Errorf("download failed with status %d", resp.StatusCode)
		setProgress(DownloadProgress{Status: "error", Error: err.Error()})
		return err
	}

	totalBytes := resp.ContentLength
	var downloadedBuf bytes.Buffer

	// Custom reader with progress reporting
	buf := make([]byte, 32*1024)
	var readBytes int64

	for {
		select {
		case <-ctx.Done():
			err := ctx.Err()
			setProgress(DownloadProgress{Status: "error", Error: err.Error()})
			return err
		default:
		}

		n, rErr := resp.Body.Read(buf)
		if n > 0 {
			downloadedBuf.Write(buf[:n])
			readBytes += int64(n)
			pct := 0
			if totalBytes > 0 {
				pct = int((readBytes * 100) / totalBytes)
			}
			setProgress(DownloadProgress{
				Status:     "downloading",
				Percentage: pct,
				TotalBytes: totalBytes,
				ReadBytes:  readBytes,
			})
		}
		if rErr != nil {
			if rErr == io.EOF {
				break
			}
			setProgress(DownloadProgress{Status: "error", Error: rErr.Error()})
			return rErr
		}
	}

	setProgress(DownloadProgress{
		Status:     "extracting",
		Percentage: 100,
		TotalBytes: totalBytes,
		ReadBytes:  readBytes,
	})

	// Extract binary from archive
	data := downloadedBuf.Bytes()
	lowerAsset := strings.ToLower(assetFileName)

	setProgress(DownloadProgress{
		Status:     "applying",
		Percentage: 100,
	})

	// Resolve current executable path
	targetExecutable, err := os.Executable()
	if err != nil {
		setProgress(DownloadProgress{Status: "error", Error: err.Error()})
		return fmt.Errorf("failed to get current executable path: %w", err)
	}
	if realExec, err := filepath.EvalSymlinks(targetExecutable); err == nil {
		targetExecutable = realExec
	}

	targetExecutableMu.Lock()
	appExecutablePath = targetExecutable
	targetExecutableMu.Unlock()

	// 1. Linux .deb package installer
	if strings.HasSuffix(lowerAsset, ".deb") {
		tmpDeb := filepath.Join(os.TempDir(), assetFileName)
		if err := os.WriteFile(tmpDeb, data, 0644); err != nil {
			setProgress(DownloadProgress{Status: "error", Error: err.Error()})
			return fmt.Errorf("failed to write deb package: %w", err)
		}
		if err := installDebPackage(tmpDeb); err != nil {
			setProgress(DownloadProgress{Status: "error", Error: err.Error()})
			return err
		}
		setProgress(DownloadProgress{Status: "ready", Percentage: 100})
		return nil
	}

	// 2. Linux .rpm package installer
	if strings.HasSuffix(lowerAsset, ".rpm") {
		tmpRpm := filepath.Join(os.TempDir(), assetFileName)
		if err := os.WriteFile(tmpRpm, data, 0644); err != nil {
			setProgress(DownloadProgress{Status: "error", Error: err.Error()})
			return fmt.Errorf("failed to write rpm package: %w", err)
		}
		if err := installRpmPackage(tmpRpm); err != nil {
			setProgress(DownloadProgress{Status: "error", Error: err.Error()})
			return err
		}
		setProgress(DownloadProgress{Status: "ready", Percentage: 100})
		return nil
	}

	// 3. Windows Setup Wizard Installer (.exe)
	if strings.HasSuffix(lowerAsset, ".exe") {
		tmpExe := filepath.Join(os.TempDir(), assetFileName)
		if err := os.WriteFile(tmpExe, data, 0755); err != nil {
			setProgress(DownloadProgress{Status: "error", Error: err.Error()})
			return fmt.Errorf("failed to write installer: %w", err)
		}
		if err := installWindowsInstaller(tmpExe); err != nil {
			setProgress(DownloadProgress{Status: "error", Error: err.Error()})
			return err
		}
		setProgress(DownloadProgress{Status: "ready", Percentage: 100})
		return nil
	}

	// 4. Standalone archive (.tar.gz / .zip)
	binaryBytes, err := extractBinaryBytes(data, assetFileName)
	if err != nil {
		setProgress(DownloadProgress{Status: "error", Error: err.Error()})
		return fmt.Errorf("failed to extract binary: %w", err)
	}

	if isTargetWritable(targetExecutable) {
		opts := selfupdate.Options{
			TargetPath: targetExecutable,
		}
		if err := selfupdate.Apply(bytes.NewReader(binaryBytes), opts); err != nil {
			setProgress(DownloadProgress{Status: "error", Error: err.Error()})
			return fmt.Errorf("failed to apply update in-place: %w", err)
		}
	} else {
		// Elevated in-place replacement using pkexec
		if err := elevatedApply(binaryBytes, targetExecutable); err != nil {
			setProgress(DownloadProgress{Status: "error", Error: err.Error()})
			return err
		}
	}

	setProgress(DownloadProgress{
		Status:     "ready",
		Percentage: 100,
	})

	return nil
}

func installDebPackage(debPath string) error {
	// 1. Try pkexec with apt-get or dpkg
	if _, err := exec.LookPath("pkexec"); err == nil {
		var cmd *exec.Cmd
		if _, aErr := exec.LookPath("apt-get"); aErr == nil {
			cmd = exec.Command("pkexec", "apt-get", "install", "-y", "--reinstall", debPath)
		} else {
			cmd = exec.Command("pkexec", "dpkg", "-i", debPath)
		}
		out, err := cmd.CombinedOutput()
		if err == nil {
			return nil
		}
		_ = out
	}

	// 2. Fallback to desktop GUI package manager (e.g. GDebi or Software Manager)
	if _, err := exec.LookPath("xdg-open"); err == nil {
		cmd := exec.Command("xdg-open", debPath)
		if err := cmd.Start(); err == nil {
			return nil
		}
	}

	return fmt.Errorf("system authorization required to install .deb. Run: sudo dpkg -i %s", debPath)
}

func installRpmPackage(rpmPath string) error {
	if _, err := exec.LookPath("pkexec"); err == nil {
		var cmd *exec.Cmd
		if _, dErr := exec.LookPath("dnf"); dErr == nil {
			cmd = exec.Command("pkexec", "dnf", "install", "-y", rpmPath)
		} else {
			cmd = exec.Command("pkexec", "rpm", "-Uvh", "--replacepkgs", rpmPath)
		}
		out, err := cmd.CombinedOutput()
		if err == nil {
			return nil
		}
		_ = out
	}

	if _, err := exec.LookPath("xdg-open"); err == nil {
		cmd := exec.Command("xdg-open", rpmPath)
		if err := cmd.Start(); err == nil {
			return nil
		}
	}

	return fmt.Errorf("system authorization required to install .rpm. Run: sudo rpm -Uvh %s", rpmPath)
}

func installWindowsInstaller(installerPath string) error {
	cmd := exec.Command(installerPath)
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("failed to start installer: %w", err)
	}
	return nil
}

func elevatedApply(binaryData []byte, targetPath string) error {
	tmpFile := filepath.Join(os.TempDir(), fmt.Sprintf("dockit_bin_%d", time.Now().UnixNano()))
	if err := os.WriteFile(tmpFile, binaryData, 0755); err != nil {
		return fmt.Errorf("failed to write temp binary: %w", err)
	}
	defer os.Remove(tmpFile)

	if _, err := exec.LookPath("pkexec"); err != nil {
		return fmt.Errorf("destination %s requires root permissions and pkexec was not found", targetPath)
	}

	cmd := exec.Command("pkexec", "sh", "-c", fmt.Sprintf("cp '%s' '%s' && chmod 755 '%s'", tmpFile, targetPath, targetPath))
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("permission elevation failed: %s (%w)", strings.TrimSpace(string(out)), err)
	}
	return nil
}

func extractBinaryBytes(archiveData []byte, assetFileName string) ([]byte, error) {
	r, err := extractBinary(archiveData, assetFileName)
	if err != nil {
		return nil, err
	}
	return io.ReadAll(r)
}

// extractBinary unpacks tar.gz or zip in-memory and returns a reader for the dockit executable.
func extractBinary(archiveData []byte, assetFileName string) (io.Reader, error) {
	lowerName := strings.ToLower(assetFileName)

	if strings.HasSuffix(lowerName, ".tar.gz") || strings.HasSuffix(lowerName, ".tgz") {
		gzr, err := gzip.NewReader(bytes.NewReader(archiveData))
		if err != nil {
			return nil, err
		}
		defer gzr.Close()

		tr := tar.NewReader(gzr)
		for {
			hdr, err := tr.Next()
			if err == io.EOF {
				break
			}
			if err != nil {
				return nil, err
			}

			cleanName := filepath.Base(hdr.Name)
			if cleanName == "dockit" || cleanName == "dockit.exe" {
				var binBuf bytes.Buffer
				if _, err := io.Copy(&binBuf, tr); err != nil {
					return nil, err
				}
				return &binBuf, nil
			}
		}
		return nil, fmt.Errorf("executable 'dockit' not found inside %s", assetFileName)
	}

	if strings.HasSuffix(lowerName, ".zip") {
		zr, err := zip.NewReader(bytes.NewReader(archiveData), int64(len(archiveData)))
		if err != nil {
			return nil, err
		}

		for _, f := range zr.File {
			cleanName := filepath.Base(f.Name)
			if cleanName == "dockit" || cleanName == "dockit.exe" {
				rc, err := f.Open()
				if err != nil {
					return nil, err
				}
				defer rc.Close()

				var binBuf bytes.Buffer
				if _, err := io.Copy(&binBuf, rc); err != nil {
					return nil, err
				}
				return &binBuf, nil
			}
		}
		return nil, fmt.Errorf("executable 'dockit' not found inside %s", assetFileName)
	}

	// Raw binary fallback
	return bytes.NewReader(archiveData), nil
}

// RestartApp respawns the updated binary and exits the current process.
func RestartApp() error {
	targetExecutableMu.RLock()
	execPath := appExecutablePath
	targetExecutableMu.RUnlock()

	if execPath == "" {
		var err error
		execPath, err = os.Executable()
		if err != nil {
			return err
		}
		execPath, err = filepath.EvalSymlinks(execPath)
		if err != nil {
			execPath, _ = os.Executable()
		}
	}

	// Safety check: On Linux / Unix, if execPath still contains .old or is pointing to the renamed old binary,
	// restore it to the actual target binary path (e.g. /home/.../Downloads/.dockit.old -> /home/.../Downloads/dockit)
	dir := filepath.Dir(execPath)
	base := filepath.Base(execPath)
	if strings.HasSuffix(base, ".old") {
		cleanBase := strings.TrimPrefix(strings.TrimSuffix(base, ".old"), ".")
		execPath = filepath.Join(dir, cleanBase)
	}

	// Verify the executable file actually exists
	if _, err := os.Stat(execPath); err != nil {
		return fmt.Errorf("target binary does not exist at %s: %w", execPath, err)
	}

	// Ensure execution permission is granted on Linux/macOS
	if runtime.GOOS != "windows" {
		_ = os.Chmod(execPath, 0755)
	}

	cmd := exec.Command(execPath, os.Args[1:]...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Stdin = os.Stdin

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("failed to start new instance: %w", err)
	}

	// Exit current process
	os.Exit(0)
	return nil
}

// matchAsset finds the appropriate binary/archive asset in GitHub release assets.
func matchAsset(assets []githubAsset, osName, arch, installType string) (string, string, []AssetOption) {
	var preferredSuffixes []string
	switch osName {
	case "linux":
		if installType == "deb" {
			preferredSuffixes = []string{"linux-amd64.deb", "linux-amd64.tar.gz"}
		} else if installType == "rpm" {
			preferredSuffixes = []string{"linux-amd64.rpm", "linux-amd64.tar.gz"}
		} else {
			preferredSuffixes = []string{"linux-amd64.tar.gz", "linux-amd64.deb"}
		}
	case "windows":
		if installType == "nsis" {
			preferredSuffixes = []string{"windows-amd64-installer.exe", "windows-amd64.zip"}
		} else {
			preferredSuffixes = []string{"windows-amd64.zip", "windows-amd64-installer.exe"}
		}
	case "darwin":
		preferredSuffixes = []string{"darwin-universal.zip", "darwin-universal.dmg"}
	}

	var availableAssets []AssetOption
	for _, a := range assets {
		lower := strings.ToLower(a.Name)
		if strings.Contains(lower, osName) {
			aType := "binary"
			if strings.HasSuffix(lower, ".deb") {
				aType = "deb"
			} else if strings.HasSuffix(lower, ".rpm") {
				aType = "rpm"
			} else if strings.HasSuffix(lower, ".tar.gz") || strings.HasSuffix(lower, ".tgz") {
				aType = "tar.gz"
			} else if strings.HasSuffix(lower, ".zip") {
				aType = "zip"
			} else if strings.HasSuffix(lower, ".exe") {
				aType = "exe"
			} else if strings.HasSuffix(lower, ".dmg") {
				aType = "dmg"
			}

			availableAssets = append(availableAssets, AssetOption{
				Name:        a.Name,
				DownloadURL: a.BrowserDownloadURL,
				Type:        aType,
				Size:        a.Size,
			})
		}
	}

	for _, suffix := range preferredSuffixes {
		for i, opt := range availableAssets {
			if strings.HasSuffix(opt.Name, suffix) {
				availableAssets[i].IsDefault = true
				return opt.Name, opt.DownloadURL, availableAssets
			}
		}
	}

	if len(availableAssets) > 0 {
		availableAssets[0].IsDefault = true
		return availableAssets[0].Name, availableAssets[0].DownloadURL, availableAssets
	}

	return "", "", nil
}

// IsNewerVersion returns true if remoteVer > localVer based on semver (e.g., v0.2.1 > v0.2.0).
func IsNewerVersion(remoteVer, localVer string) bool {
	rNums := parseSemver(remoteVer)
	lNums := parseSemver(localVer)

	for i := 0; i < len(rNums) && i < len(lNums); i++ {
		if rNums[i] > lNums[i] {
			return true
		}
		if rNums[i] < lNums[i] {
			return false
		}
	}
	return len(rNums) > len(lNums)
}

func parseSemver(v string) []int {
	v = strings.TrimPrefix(v, "v")
	v = strings.TrimPrefix(v, "V")
	if idx := strings.IndexAny(v, "-+"); idx != -1 {
		v = v[:idx]
	}

	parts := strings.Split(v, ".")
	nums := make([]int, 0, len(parts))
	for _, p := range parts {
		if n, err := strconv.Atoi(strings.TrimSpace(p)); err == nil {
			nums = append(nums, n)
		}
	}
	return nums
}
