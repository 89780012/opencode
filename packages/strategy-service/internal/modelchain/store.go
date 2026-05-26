package modelchain

import localdb "strategy-service/internal/db"

type store struct{}

func (s *store) load() (Config, error) {
	doc, err := localdb.Open()
	if err != nil {
		return Default(), err
	}
	rows, err := doc.Query("select provider_id, model_id, updated_at from model_chain order by position asc")
	if err != nil {
		return Default(), err
	}
	defer rows.Close()

	cfg := Default()
	for rows.Next() {
		var row Model
		if err := rows.Scan(&row.ProviderID, &row.ModelID, &cfg.UpdatedAt); err != nil {
			return Default(), err
		}
		cfg.Chain = append(cfg.Chain, row)
	}
	if err := rows.Err(); err != nil {
		return Default(), err
	}
	return clean(cfg), nil
}

func (s *store) save(cfg Config) (Config, error) {
	doc, err := localdb.Open()
	if err != nil {
		return Default(), err
	}
	cfg = clean(cfg)
	tx, err := doc.Begin()
	if err != nil {
		return Default(), err
	}
	if _, err := tx.Exec("delete from model_chain"); err != nil {
		_ = tx.Rollback()
		return Default(), err
	}
	for pos, row := range cfg.Chain {
		_, err := tx.Exec("insert into model_chain(position, provider_id, model_id, updated_at) values (?, ?, ?, ?)", pos, row.ProviderID, row.ModelID, cfg.UpdatedAt)
		if err != nil {
			_ = tx.Rollback()
			return Default(), err
		}
	}
	if err := tx.Commit(); err != nil {
		return Default(), err
	}
	return cfg, nil
}
