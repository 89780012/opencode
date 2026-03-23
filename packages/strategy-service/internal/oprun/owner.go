package oprun

import (
	"encoding/json"
	"os"
	"path/filepath"
	"time"

	cfg "strategy-service/internal/config"
)

type owner struct {
	PID       int        `json:"pid"`
	Bin       string     `json:"bin"`
	Host      string     `json:"host"`
	Port      int        `json:"port"`
	Cwd       string     `json:"cwd,omitempty"`
	StartedAt *time.Time `json:"started_at,omitempty"`
}

func ownerPath() (string, error) {
	root, err := cfg.Root()
	if err != nil {
		return "", err
	}
	return filepath.Join(root, "opencode-owner.json"), nil
}

func readOwner() (owner, error) {
	path, err := ownerPath()
	if err != nil {
		return owner{}, err
	}

	body, err := os.ReadFile(path)
	if err != nil {
		return owner{}, err
	}

	out := owner{}
	err = json.Unmarshal(body, &out)
	if err != nil {
		return owner{}, err
	}
	return out, nil
}

func writeOwner(item owner) error {
	path, err := ownerPath()
	if err != nil {
		return err
	}

	body, err := json.MarshalIndent(item, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(path, append(body, '\n'), 0o644)
}

func dropOwner() {
	path, err := ownerPath()
	if err != nil {
		return
	}

	_ = os.Remove(path)
}

func (m *Manager) owner() (owner, bool) {
	item, err := readOwner()
	if err != nil {
		return owner{}, false
	}

	if item.PID <= 0 || item.Host != m.cfg.Host || item.Port != m.cfg.Port || item.Bin != m.cfg.Bin || item.Cwd != m.cfg.Cwd {
		return owner{}, false
	}

	return item, true
}
