//go:build windows

package host

import (
	"runtime"
	"syscall"
	"unsafe"
)

var (
	modKernel32            = syscall.NewLazyDLL("kernel32.dll")
	procGlobalMemoryStatus = modKernel32.NewProc("GlobalMemoryStatusEx")
	procGetSystemTimes     = modKernel32.NewProc("GetSystemTimes")
)

type memoryStatusEx struct {
	cbSize                  uint32
	dwMemoryLoad            uint32
	ullTotalPhys            uint64
	ullAvailPhys            uint64
	ullTotalPageFile        uint64
	ullAvailPageFile        uint64
	ullTotalVirtual         uint64
	ullAvailVirtual         uint64
	ullAvailExtendedVirtual uint64
}

type fileTime struct {
	dwLowDateTime  uint32
	dwHighDateTime uint32
}

func (ft *fileTime) toUint64() uint64 {
	return (uint64(ft.dwHighDateTime) << 32) | uint64(ft.dwLowDateTime)
}

func (c *Collector) Collect() *Metrics {
	m := &Metrics{
		CPUs: runtime.NumCPU(),
		OS:   runtime.GOOS,
		Arch: runtime.GOARCH,
	}

	var mem memoryStatusEx
	mem.cbSize = uint32(unsafe.Sizeof(mem))
	r, _, _ := procGlobalMemoryStatus.Call(uintptr(unsafe.Pointer(&mem)))
	if r != 0 && mem.ullTotalPhys > 0 {
		m.TotalMemory = mem.ullTotalPhys
		m.FreeMemory = mem.ullAvailPhys
		m.UsedMemory = mem.ullTotalPhys - mem.ullAvailPhys
		m.MemoryPercent = float64(mem.dwMemoryLoad)
	}

	c.mu.Lock()
	defer c.mu.Unlock()

	var idle, kernel, user fileTime
	r2, _, _ := procGetSystemTimes.Call(
		uintptr(unsafe.Pointer(&idle)),
		uintptr(unsafe.Pointer(&kernel)),
		uintptr(unsafe.Pointer(&user)),
	)
	if r2 != 0 {
		idleTime := idle.toUint64()
		kernelTime := kernel.toUint64()
		userTime := user.toUint64()
		totalTime := kernelTime + userTime

		if c.prevTotal > 0 && totalTime > c.prevTotal {
			deltaTotal := totalTime - c.prevTotal
			deltaIdle := idleTime - c.prevIdle
			if deltaTotal >= deltaIdle {
				deltaUsed := deltaTotal - deltaIdle
				m.CPUPercent = float64(deltaUsed) / float64(deltaTotal) * 100
			}
		}
		c.prevTotal = totalTime
		c.prevIdle = idleTime
	}

	return m
}
