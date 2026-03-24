package meta

import (
	"runtime/debug"
	"strconv"
	"strings"
)

var Version = ""
var Channel = ""
var Commit = ""
var BuiltAt = ""
var Dirty = ""

type State struct {
	Current Info `json:"current"`
}

type Info struct {
	Version string `json:"version"`
	Channel string `json:"channel"`
	Env     string `json:"env"`
	Commit  string `json:"commit,omitempty"`
	Dirty   bool   `json:"dirty"`
	BuiltAt string `json:"built_at,omitempty"`
}

func Current() State {
	row := Info{
		Version: strings.TrimSpace(Version),
		Channel: strings.TrimSpace(Channel),
		Commit:  strings.TrimSpace(Commit),
		BuiltAt: strings.TrimSpace(BuiltAt),
		Dirty:   flag(Dirty),
	}

	if info, ok := debug.ReadBuildInfo(); ok {
		set := map[string]string{}
		for _, item := range info.Settings {
			set[item.Key] = item.Value
		}

		if row.Commit == "" {
			row.Commit = short(set["vcs.revision"])
		}
		if row.BuiltAt == "" {
			row.BuiltAt = strings.TrimSpace(set["vcs.time"])
		}
		if Dirty == "" {
			row.Dirty = set["vcs.modified"] == "true"
		}
	}

	if row.Version == "" {
		row.Version = dev(row.Commit)
	}
	if row.Channel == "" {
		row.Channel = "dev"
	}
	row.Env = env(row.Channel)

	return State{
		Current: row,
	}
}

func dev(commit string) string {
	if commit == "" {
		return "dev"
	}

	return "dev+" + commit
}

func env(channel string) string {
	if channel == "stable" {
		return "production"
	}

	return "development"
}

func flag(input string) bool {
	if input == "" {
		return false
	}

	ok, err := strconv.ParseBool(input)
	if err != nil {
		return false
	}

	return ok
}

func short(input string) string {
	if len(input) <= 7 {
		return input
	}

	return input[:7]
}
