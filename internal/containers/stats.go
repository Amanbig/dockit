package containers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
)

// ResourceStats represents parsed, human-readable resource statistics for a container.
type ResourceStats struct {
	CPUPercent    float64 `json:"cpuPercent"`
	MemoryUsage   uint64  `json:"memoryUsage"`
	MemoryLimit   uint64  `json:"memoryLimit"`
	MemoryPercent float64 `json:"memoryPercent"`
	NetRxBytes    uint64  `json:"netRxBytes"`
	NetTxBytes    uint64  `json:"netTxBytes"`
	BlockRead     uint64  `json:"blockRead"`
	BlockWrite    uint64  `json:"blockWrite"`
	PIDs          uint64  `json:"pids"`
}

// rawDockerStats matches the JSON payload streamed by Docker/Podman engine stats API.
type rawDockerStats struct {
	Read      string `json:"read"`
	Preread   string `json:"preread"`
	PidsStats struct {
		Current uint64 `json:"current"`
	} `json:"pids_stats"`
	CPUStats struct {
		CPUUsage struct {
			TotalUsage        uint64   `json:"total_usage"`
			PercpuUsage       []uint64 `json:"percpu_usage"`
			UsageInKernelmode uint64   `json:"usage_in_kernelmode"`
			UsageInUsermode   uint64   `json:"usage_in_usermode"`
		} `json:"cpu_usage"`
		SystemCPUUsage uint64 `json:"system_cpu_usage"`
		OnlineCPUs     uint32 `json:"online_cpus"`
	} `json:"cpu_stats"`
	PreCPUStats struct {
		CPUUsage struct {
			TotalUsage uint64 `json:"total_usage"`
		} `json:"cpu_usage"`
		SystemCPUUsage uint64 `json:"system_cpu_usage"`
	} `json:"precpu_stats"`
	MemoryStats struct {
		Usage uint64 `json:"usage"`
		Limit uint64 `json:"limit"`
		Stats struct {
			InactiveFile uint64 `json:"inactive_file"`
			TotalInactiveFile uint64 `json:"total_inactive_file"`
			Cache uint64 `json:"cache"`
		} `json:"stats"`
	} `json:"memory_stats"`
	Networks map[string]struct {
		RxBytes uint64 `json:"rx_bytes"`
		TxBytes uint64 `json:"tx_bytes"`
	} `json:"networks"`
	BlkioStats struct {
		IOServiceBytesRecursive []struct {
			Major uint64 `json:"major"`
			Minor uint64 `json:"minor"`
			Op    string `json:"op"`
			Value uint64 `json:"value"`
		} `json:"io_service_bytes_recursive"`
	} `json:"blkio_stats"`
}

// ParseResourceStats calculates percentages from raw stats JSON stream.
func ParseResourceStats(r io.Reader) (*ResourceStats, error) {
	var raw rawDockerStats
	if err := json.NewDecoder(r).Decode(&raw); err != nil {
		return nil, fmt.Errorf("failed to decode stats: %w", err)
	}

	res := &ResourceStats{
		PIDs: raw.PidsStats.Current,
	}

	// 1. Calculate CPU Percent
	cpuDelta := float64(raw.CPUStats.CPUUsage.TotalUsage) - float64(raw.PreCPUStats.CPUUsage.TotalUsage)
	systemDelta := float64(raw.CPUStats.SystemCPUUsage) - float64(raw.PreCPUStats.SystemCPUUsage)
	onlineCPUs := float64(raw.CPUStats.OnlineCPUs)
	if onlineCPUs == 0 {
		onlineCPUs = float64(len(raw.CPUStats.CPUUsage.PercpuUsage))
	}
	if onlineCPUs == 0 {
		onlineCPUs = 1.0
	}

	if systemDelta > 0.0 && cpuDelta > 0.0 {
		res.CPUPercent = (cpuDelta / systemDelta) * onlineCPUs * 100.0
	}

	// 2. Calculate Memory Usage & Limit
	memUsage := raw.MemoryStats.Usage
	// Linux cgroups v1 / v2 cache deduction for authentic resident memory
	if raw.MemoryStats.Stats.InactiveFile > 0 {
		if memUsage > raw.MemoryStats.Stats.InactiveFile {
			memUsage -= raw.MemoryStats.Stats.InactiveFile
		}
	} else if raw.MemoryStats.Stats.TotalInactiveFile > 0 {
		if memUsage > raw.MemoryStats.Stats.TotalInactiveFile {
			memUsage -= raw.MemoryStats.Stats.TotalInactiveFile
		}
	}

	res.MemoryUsage = memUsage
	res.MemoryLimit = raw.MemoryStats.Limit
	if res.MemoryLimit > 0 {
		res.MemoryPercent = (float64(res.MemoryUsage) / float64(res.MemoryLimit)) * 100.0
	}

	// 3. Network I/O
	for _, net := range raw.Networks {
		res.NetRxBytes += net.RxBytes
		res.NetTxBytes += net.TxBytes
	}

	// 4. Block I/O
	for _, bio := range raw.BlkioStats.IOServiceBytesRecursive {
		switch bio.Op {
		case "read", "Read":
			res.BlockRead += bio.Value
		case "write", "Write":
			res.BlockWrite += bio.Value
		}
	}

	return res, nil
}

// GetResourceStats retrieves a snapshot of resource utilization for a container.
func (s *Service) GetResourceStats(ctx context.Context, id string) (*ResourceStats, error) {
	rc, err := s.Stats(ctx, id, false)
	if err != nil {
		return nil, err
	}
	defer rc.Close()

	return ParseResourceStats(rc)
}
