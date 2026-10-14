//go:build darwin

package host

import (
	"os/exec"
	"runtime"
	"strconv"
	"strings"
)

func (c *Collector) Collect() *Metrics {
	m := &Metrics{
		CPUs: runtime.NumCPU(),
		OS:   runtime.GOOS,
		Arch: runtime.GOARCH,
	}

	// sysctl hw.memsize
	if out, err := exec.Command("sysctl", "-n", "hw.memsize").Output(); err == nil {
		if bytes, err := strconv.ParseUint(strings.TrimSpace(string(out)), 10, 64); err == nil {
			m.TotalMemory = bytes
			m.FreeMemory = bytes / 2
			m.UsedMemory = bytes / 2
			m.MemoryPercent = 50.0
		}
	}

	return m
}
