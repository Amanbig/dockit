package registry

import (
	"context"
	"fmt"
	"sync"
)

// Service coordinates multiple container image registries.
type Service struct {
	mu         sync.RWMutex
	registries map[string]Registry
}

// NewService creates a new registry Service.
func NewService() *Service {
	return &Service{
		registries: make(map[string]Registry),
	}
}

// Register registers a registry client.
func (s *Service) Register(reg Registry) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.registries[reg.Name()] = reg
}

// Get returns the registry client registered under the given name.
func (s *Service) Get(name string) (Registry, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	reg, exists := s.registries[name]
	if !exists {
		return nil, fmt.Errorf("registry %q not found", name)
	}
	return reg, nil
}

// ListRegistries returns the names of all registered registries.
func (s *Service) ListRegistries() []string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	names := make([]string, 0, len(s.registries))
	for name := range s.registries {
		names = append(names, name)
	}
	return names
}

// Search searches across a specific registry.
func (s *Service) Search(ctx context.Context, registryName, query string, opts SearchOptions) ([]SearchResult, error) {
	reg, err := s.Get(registryName)
	if err != nil {
		return nil, err
	}
	return reg.Search(ctx, query, opts)
}

// SearchAll searches across all registered registries in parallel.
func (s *Service) SearchAll(ctx context.Context, query string, opts SearchOptions) ([]SearchResult, error) {
	s.mu.RLock()
	all := make([]Registry, 0, len(s.registries))
	for _, reg := range s.registries {
		all = append(all, reg)
	}
	s.mu.RUnlock()

	var wg sync.WaitGroup
	var mu sync.Mutex
	var aggregated []SearchResult

	for _, reg := range all {
		wg.Add(1)
		go func(r Registry) {
			defer wg.Done()
			results, err := r.Search(ctx, query, opts)
			if err == nil && len(results) > 0 {
				mu.Lock()
				aggregated = append(aggregated, results...)
				mu.Unlock()
			}
		}(reg)
	}

	wg.Wait()
	return aggregated, nil
}

// GetTags retrieves tags for a repository from a specific registry.
func (s *Service) GetTags(ctx context.Context, registryName, repository string) ([]Tag, error) {
	reg, err := s.Get(registryName)
	if err != nil {
		return nil, err
	}
	return reg.GetTags(ctx, repository)
}

// GetMetadata retrieves metadata for a repository from a specific registry.
func (s *Service) GetMetadata(ctx context.Context, registryName, repository string) (*ImageMetadata, error) {
	reg, err := s.Get(registryName)
	if err != nil {
		return nil, err
	}
	return reg.GetMetadata(ctx, repository)
}
