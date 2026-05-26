package modelchain

import "strings"

const ChainLimit = 10

func Default() Config {
	return Config{
	}
}

func clean(cfg Config) Config {
	out := Default()
	out.UpdatedAt = cfg.UpdatedAt
	out.Chain = make([]Model, 0, len(cfg.Chain))
	seen := map[string]bool{}
	for _, item := range cfg.Chain {
		if len(out.Chain) >= ChainLimit {
			break
		}
		item.ProviderID = strings.TrimSpace(item.ProviderID)
		item.ModelID = strings.TrimSpace(item.ModelID)
		if item.ProviderID == "" || item.ModelID == "" {
			continue
		}
		key := item.ProviderID + "/" + item.ModelID
		if seen[key] {
			continue
		}
		seen[key] = true
		out.Chain = append(out.Chain, item)
	}
	return out
}
