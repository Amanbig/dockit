package containers

// Container represents the container data the UI needs.
type Container struct {
	ID      string   `json:"id"`
	ShortID string   `json:"shortId"`
	Name    string   `json:"name"`
	Image   string   `json:"image"`
	Status  string   `json:"status"`
	State   string   `json:"state"`
	Ports   []string `json:"ports"`
	Created int64    `json:"created,omitempty"`
}