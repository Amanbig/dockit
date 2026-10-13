package containers

import (
	"strings"
	"testing"
)

func TestParseResourceStats(t *testing.T) {
	jsonPayload := `{
		"cpu_stats": {
			"cpu_usage": {
				"total_usage": 200000000,
				"percpu_usage": [100000000, 100000000]
			},
			"system_cpu_usage": 2000000000,
			"online_cpus": 2
		},
		"precpu_stats": {
			"cpu_usage": {
				"total_usage": 100000000
			},
			"system_cpu_usage": 1000000000
		},
		"memory_stats": {
			"usage": 104857600,
			"limit": 1073741824,
			"stats": {
				"inactive_file": 4857600
			}
		},
		"networks": {
			"eth0": {
				"rx_bytes": 1024,
				"tx_bytes": 2048
			}
		},
		"pids_stats": {
			"current": 12
		}
	}`

	stats, err := ParseResourceStats(strings.NewReader(jsonPayload))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if stats.PIDs != 12 {
		t.Errorf("expected PIDs 12, got %d", stats.PIDs)
	}

	// CPU = (100000000 / 1000000000) * 2 * 100 = 20%
	if stats.CPUPercent < 19.9 || stats.CPUPercent > 20.1 {
		t.Errorf("expected ~20%% CPU, got %f", stats.CPUPercent)
	}

	// Memory = 104857600 - 4857600 = 100000000
	if stats.MemoryUsage != 100000000 {
		t.Errorf("expected MemoryUsage 100000000, got %d", stats.MemoryUsage)
	}

	if stats.NetRxBytes != 1024 || stats.NetTxBytes != 2048 {
		t.Errorf("expected 1024/2048 net bytes, got %d/%d", stats.NetRxBytes, stats.NetTxBytes)
	}
}
