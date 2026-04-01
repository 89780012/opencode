package group

import "strategy-service/internal/workspace"

type Item struct {
	ID        string          `json:"id"`
	Name      string          `json:"name"`
	Path      string          `json:"path"`
	Order     int             `json:"order"`
	Workspace workspace.Local `json:"workspace"`
}

type Row struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Count     int    `json:"count"`
	CreatedAt int64  `json:"created_at"`
	UpdatedAt int64  `json:"updated_at"`
	Items     []Item `json:"items"`
}

type ListResult struct {
	Groups []Row `json:"groups"`
}

type DetailResult struct {
	Group Row `json:"group"`
}

type CreateResult struct {
	Group Row `json:"group"`
}
