package updater

import (
	"testing"
)

func TestIsNewerVersion(t *testing.T) {
	tests := []struct {
		remote string
		local  string
		want   bool
	}{
		{"v0.2.1", "v0.2.0", true},
		{"v0.3.0", "v0.2.0", true},
		{"v1.0.0", "v0.9.9", true},
		{"v0.2.0", "v0.2.0", false},
		{"v0.1.9", "v0.2.0", false},
		{"0.2.1", "0.2.0", true},
		{"v0.2.0-beta.1", "v0.2.0", false},
		{"v0.2.1-rc1", "v0.2.0", true},
	}

	for _, tc := range tests {
		got := IsNewerVersion(tc.remote, tc.local)
		if got != tc.want {
			t.Errorf("IsNewerVersion(%q, %q) = %v; want %v", tc.remote, tc.local, got, tc.want)
		}
	}
}

func TestMatchAsset(t *testing.T) {
	assets := []githubAsset{
		{Name: "dockit-linux-amd64.tar.gz", BrowserDownloadURL: "https://example.com/linux"},
		{Name: "dockit-windows-amd64.zip", BrowserDownloadURL: "https://example.com/win"},
		{Name: "dockit-darwin-universal.zip", BrowserDownloadURL: "https://example.com/mac"},
	}

	name, url := matchAsset(assets, "linux", "amd64")
	if name != "dockit-linux-amd64.tar.gz" || url != "https://example.com/linux" {
		t.Fatalf("unexpected asset for linux: %s, %s", name, url)
	}

	name, url = matchAsset(assets, "windows", "amd64")
	if name != "dockit-windows-amd64.zip" || url != "https://example.com/win" {
		t.Fatalf("unexpected asset for windows: %s, %s", name, url)
	}

	name, url = matchAsset(assets, "darwin", "arm64")
	if name != "dockit-darwin-universal.zip" || url != "https://example.com/mac" {
		t.Fatalf("unexpected asset for mac: %s, %s", name, url)
	}
}
