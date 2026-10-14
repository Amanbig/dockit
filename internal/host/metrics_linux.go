//go:build linux

package host

import (
	"bufio"
	"os"
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

	// Memory from /proc/meminfo
	if f, err := os.Open("/proc/meminfo"); err == nil {
		var memTotal, memAvail uint64
		scanner := bufio.NewScanner(f)
		for scanner.Scan() {
			fields := strings.Fields(scanner.Text())
			if len(fields) >= 2 {
				key := strings.TrimSuffix(fields[0], ":")
				val, _ := strconv.ParseUint(fields[1], 10, 64)
				switch key {
				case "MemTotal":
					memTotal = val * 1024
				case "MemAvailable":
					memAvail = val * 1024
				}
			}
		}
		_ = f.Close()

		if memTotal > 0 {
			m.TotalMemory = memTotal
			m.FreeMemory = memAvail
			m.UsedMemory = memTotal - memAvail
			m.MemoryPercent = float64(m.UsedMemory) / float64(memTotal) * 100
		}
	}

	// CPU utilization from /proc/stat
	c.mu.Lock()
	defer c.mu.Unlock()

	if f, err := os.Open("/proc/stat"); err == nil {
		scanner := bufio.NewScanner(f)
		for scanner.Scan() {
			line := scanner.Text()
			if strings.HasPrefix(line, "cpu ") {
				fields := strings.Fields(line)[1:]
				var total, idle uint64
				for i, field := range fields {
					val, _ := strconv.ParseUint(field, 10, 64)
					total += val
					if i == 3 {
						idle = val
					}
				}

				if c.prevTotal > 0 && total > c.prevTotal {
					deltaTotal := total - c.prevTotal
					deltaIdle := idle - c.prevIdle
					if deltaTotal >= deltaIdle {
						deltaUsed := deltaTotal - deltaIdle
						m.CPUPercent = float64(deltaUsed) / float64(deltaTotal) * 100
					}
				}
				c.prevTotal = total
				c.prevIdle = idle
				break
			}
		}
		_ = f.Close()
	}

	return m
}
