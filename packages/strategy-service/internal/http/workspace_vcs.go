package web

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"sync"
	"time"

	"strategy-service/internal/workspace"
)

var opclient = &http.Client{
	Timeout:   2 * time.Second,
	Transport: &http.Transport{Proxy: nil},
}

type project struct {
	VCS string `json:"vcs,omitempty"`
}

func (a *API) workspaceLocal(ctx context.Context, item workspace.Local) workspace.Local {
	return a.workspaceLocals(ctx, []workspace.Local{item})[0]
}

func (a *API) workspaceLocals(ctx context.Context, items []workspace.Local) []workspace.Local {
	if len(items) == 0 {
		return items
	}

	if err := a.op.Ensure(ctx); err != nil {
		slog.Debug("workspace vcs unavailable", "error", err)
		return items
	}

	out := append([]workspace.Local{}, items...)
	var wait sync.WaitGroup
	wait.Add(len(out))

	for i := range out {
		go func(i int) {
			defer wait.Done()

			vcs, err := a.workspaceVCS(ctx, out[i].Path)
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

func (a *API) workspaceVCS(ctx context.Context, dir string) (string, error) {
	target := a.op.Target()
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
