//go:build !linux && !windows && !darwin

package host

import "runtime"

func (c *Collector) Collect() *Metrics {
	return &Metrics{
		CPUs: runtime.NumCPU(),
		OS:   runtime.GOOS,
		Arch: runtime.GOARCH,
	}
}
