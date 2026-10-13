package updater

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"runtime"
	"strconv"
	"strings"
	"time"

	"dockit/internal/version"
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
		// No release has been published yet
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

	// Find best matching asset for current OS/arch
	assetName, downloadURL := matchAsset(rel.Assets, runtime.GOOS, runtime.GOARCH)
	info.AssetFileName = assetName
	info.DownloadURL = downloadURL
	if info.DownloadURL == "" {
		info.DownloadURL = rel.HTMLURL
	}

	// Compare semantic versions
	if IsNewerVersion(rel.TagName, currentVer) {
		info.Available = true
	}

	return info, nil
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
	// Strip build / pre-release suffixes for comparison, e.g. -beta, +build
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
