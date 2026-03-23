package workspace

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"sync"
	"time"
)

var opclient = &http.Client{
	Timeout:   2 * time.Second,
	Transport: &http.Transport{Proxy: nil},
}

type project struct {
	VCS string `json:"vcs,omitempty"`
}

type VCS interface {
	Ensure(context.Context) error
	Target() *url.URL
}

// Enrich attaches VCS metadata to local workspaces when opencode is reachable.
func Enrich(ctx context.Context, items []Local, src VCS) []Local {
	if len(items) == 0 || src == nil {
		return items
	}

	if err := src.Ensure(ctx); err != nil {
		slog.Debug("workspace vcs unavailable", "error", err)
		return items
	}

	out := append([]Local{}, items...)
	var wait sync.WaitGroup
	wait.Add(len(out))

	for i := range out {
		go func(i int) {
			defer wait.Done()

			vcs, err := lookup(ctx, src, out[i].Path)
			slog.Info("workspace vcs", "path", out[i].Path, "vcs", vcs)
			if err != nil {
				slog.Debug("workspace vcs failed", "path", out[i].Path, "error", err)
				return
			}

			out[i].VCS = vcs
		}(i)
	}

	wait.Wait()
	return out
}

func lookup(ctx context.Context, src VCS, dir string) (string, error) {
	target := src.Target()
	target.Path = "/project/current"
	target.RawQuery = url.Values{
		"directory": []string{dir},
	}.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, target.String(), nil)
	if err != nil {
		return "", err
	}

	res, err := opclient.Do(req)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()

	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return "", fmt.Errorf("unexpected status: %s", res.Status)
	}

	var data project
	if err := json.NewDecoder(res.Body).Decode(&data); err != nil {
		return "", err
	}

	return data.VCS, nil
}
