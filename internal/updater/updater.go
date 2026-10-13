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

// UpdateInfo holds details about the latest available release.
type UpdateInfo struct {
	Available      bool   `json:"available"`
	CurrentVersion string `json:"currentVersion"`
	LatestVersion  string `json:"latestVersion"`
	ReleaseName    string `json:"releaseName"`
	ReleaseNotes   string `json:"releaseNotes"`
	PublishedAt    string `json:"publishedAt"`
	ReleaseURL     string `json:"releaseUrl"`
	DownloadURL    string `json:"downloadUrl"`
	AssetFileName  string `json:"assetFileName"`
	Platform       string `json:"platform"`
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

// CheckForUpdate queries the GitHub Releases API for the latest release and compares it with the current running version.
func CheckForUpdate(ctx context.Context) (*UpdateInfo, error) {
	currentVer := version.Version
	info := &UpdateInfo{
		Available:      false,
		CurrentVersion: currentVer,
		LatestVersion:  currentVer,
		Platform:       fmt.Sprintf("%s/%s", runtime.GOOS, runtime.GOARCH),
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

	assetName, downloadURL := matchAsset(rel.Assets, runtime.GOOS, runtime.GOARCH)
	info.AssetFileName = assetName
	info.DownloadURL = downloadURL
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
	binaryReader, err := extractBinary(data, assetFileName)
	if err != nil {
		setProgress(DownloadProgress{Status: "error", Error: err.Error()})
		return fmt.Errorf("failed to extract binary: %w", err)
	}

	setProgress(DownloadProgress{
		Status:     "applying",
		Percentage: 100,
	})

	// Resolve current executable path BEFORE selfupdate modifies or moves it
	targetExecutable, err := os.Executable()
	if err != nil {
		setProgress(DownloadProgress{Status: "error", Error: err.Error()})
		return fmt.Errorf("failed to get current executable path: %w", err)
	}
	targetExecutable, err = filepath.EvalSymlinks(targetExecutable)
	if err != nil {
		targetExecutable, _ = os.Executable()
	}

	// Persist the real target binary path so RestartApp invokes the new binary, not .old
	targetExecutableMu.Lock()
	appExecutablePath = targetExecutable
	targetExecutableMu.Unlock()

	opts := selfupdate.Options{
		TargetPath: targetExecutable,
	}

	if err := selfupdate.Apply(binaryReader, opts); err != nil {
		setProgress(DownloadProgress{Status: "error", Error: err.Error()})
		return fmt.Errorf("failed to apply update in-place: %w", err)
	}

	setProgress(DownloadProgress{
		Status:     "ready",
		Percentage: 100,
	})

	return nil
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
func matchAsset(assets []githubAsset, osName, arch string) (string, string) {
	var targetSuffix string
	switch osName {
	case "windows":
		targetSuffix = "windows-amd64.zip"
	case "darwin":
		targetSuffix = "darwin-universal.zip"
	case "linux":
		targetSuffix = "linux-amd64.tar.gz"
	}

	for _, a := range assets {
		if targetSuffix != "" && strings.HasSuffix(a.Name, targetSuffix) {
			return a.Name, a.BrowserDownloadURL
		}
	}

	// Fallback loose match
	for _, a := range assets {
		lower := strings.ToLower(a.Name)
		if strings.Contains(lower, osName) {
			return a.Name, a.BrowserDownloadURL
		}
	}

	return "", ""
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
