package networks

// Network represents a container network formatted for the UI.
type Network struct {
	ID         string            `json:"id"`
	ShortID    string            `json:"shortId"`
	Name       string            `json:"name"`
	Driver     string            `json:"driver"`
	Scope      string            `json:"scope"`
	Internal   bool              `json:"internal"`
	Attachable bool              `json:"attachable"`
	Subnet     string            `json:"subnet,omitempty"`
	Gateway    string            `json:"gateway,omitempty"`
	Containers map[string]string `json:"containers,omitempty"`
	Labels     map[string]string `json:"labels"`
}
