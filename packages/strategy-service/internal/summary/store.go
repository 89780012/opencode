package summary

import "strategy-service/internal/db"

type store struct{}

func (s *store) load() (Index, error) {
	doc, err := db.Open()
	if err != nil {
		return Index{}, err
	}
	rows, err := doc.Query(`select workspace_path, session_id, summary_session_id, state, text, updated_at, err, last_text, last_updated_at from summaries order by updated_at asc`)
	if err != nil {
		return Index{}, err
	}
	defer rows.Close()

	idx := Index{}
	for rows.Next() {
		var row Entry
		if err := rows.Scan(&row.WorkspacePath, &row.SessionID, &row.SummarySessionID, &row.State, &row.Text, &row.UpdatedAt, &row.Err, &row.LastText, &row.LastUpdatedAt); err != nil {
			return Index{}, err
		}
		idx.Summaries = append(idx.Summaries, row)
	}
	return idx, rows.Err()
}

func (s *store) save(idx Index) error {
	doc, err := db.Open()
	if err != nil {
		return err
	}
	tx, err := doc.Begin()
	if err != nil {
		return err
	}
	if _, err := tx.Exec("delete from summaries"); err != nil {
		_ = tx.Rollback()
		return err
	}
	for _, row := range idx.Summaries {
		_, err := tx.Exec(`insert into summaries(workspace_path, session_id, summary_session_id, state, text, updated_at, err, last_text, last_updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?)`, row.WorkspacePath, row.SessionID, row.SummarySessionID, row.State, row.Text, row.UpdatedAt, row.Err, row.LastText, row.LastUpdatedAt)
		if err != nil {
			_ = tx.Rollback()
			return err
		}
	}
	return tx.Commit()
}
