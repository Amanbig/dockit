package volumes

// Volume represents a storage volume formatted for the UI.
type Volume struct {
	Name          string            `json:"name"`
	Driver        string            `json:"driver"`
	Mountpoint    string            `json:"mountpoint"`
	CreatedAt     string            `json:"createdAt"`
	Labels        map[string]string `json:"labels"`
	Scope         string            `json:"scope"`
	Size          int64             `json:"size"`
	FormattedSize string            `json:"formattedSize"`
}
