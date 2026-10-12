package images

// Image represents a local container image formatted for the UI.
type Image struct {
	ID            string            `json:"id"`
	ShortID       string            `json:"shortId"`
	Repository    string            `json:"repository"`
	Tag           string            `json:"tag"`
	RepoTags      []string          `json:"repoTags"`
	RepoDigests   []string          `json:"repoDigests"`
	Created       int64             `json:"created"`
	Size          int64             `json:"size"`
	FormattedSize string            `json:"formattedSize"`
	Containers    int64             `json:"containers"`
	Labels        map[string]string `json:"labels"`
}
