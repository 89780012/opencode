package question

import "strategy-service/internal/db"

type store struct{}

func (s *store) load() (Index, error) {
	doc, err := db.Open()
	if err != nil {
		return Index{}, err
	}
	rows, err := doc.Query("select id, workspace_path, session_id, message_id, text, created_at from questions order by created_at asc")
	if err != nil {
		return Index{}, err
	}
	defer rows.Close()

	idx := Index{}
	for rows.Next() {
		var row Entry
		if err := rows.Scan(&row.ID, &row.WorkspacePath, &row.SessionID, &row.MessageID, &row.Body, &row.CreatedAt); err != nil {
			return Index{}, err
		}
		idx.Questions = append(idx.Questions, row)
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
	if _, err := tx.Exec("delete from questions"); err != nil {
		_ = tx.Rollback()
		return err
	}
	for _, row := range idx.Questions {
		_, err := tx.Exec("insert into questions(id, workspace_path, session_id, message_id, text, created_at) values (?, ?, ?, ?, ?, ?)", row.ID, row.WorkspacePath, row.SessionID, row.MessageID, row.Body, row.CreatedAt)
		if err != nil {
			_ = tx.Rollback()
			return err
		}
	}
	return tx.Commit()
}
