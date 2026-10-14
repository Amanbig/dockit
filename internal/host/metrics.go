package host

import "sync"

// Metrics holds real-time host hardware and resource measurements.
type Metrics struct {
	TotalMemory   uint64  `json:"totalMemory"`   // Total physical memory in bytes
	UsedMemory    uint64  `json:"usedMemory"`    // Used physical memory in bytes
	FreeMemory    uint64  `json:"freeMemory"`    // Free/available physical memory in bytes
	MemoryPercent float64 `json:"memoryPercent"` // Memory utilization percentage (0 - 100)
	CPUs          int     `json:"cpus"`          // Total logical CPU cores
	CPUPercent    float64 `json:"cpuPercent"`    // Instantaneous CPU utilization percentage (0 - 100)
	OS            string  `json:"os"`            // Host OS (e.g., "linux", "windows", "darwin")
	Arch          string  `json:"arch"`          // Architecture (e.g., "amd64", "arm64")
}

// Collector maintains state across metric calls to compute rate metrics like CPU usage.
type Collector struct {
	mu        sync.Mutex
	prevIdle  uint64
	prevTotal uint64
}

var defaultCollector = &Collector{}

// GetMetrics returns the current host resource metrics.
func GetMetrics() *Metrics {
	return defaultCollector.Collect()
}
