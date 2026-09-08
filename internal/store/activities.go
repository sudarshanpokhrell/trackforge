package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"
)

// The issue_activity_type enum. label_added / label_removed exist in the enum
// but have no labels table behind them yet, so nothing writes them.
const (
	ActivityCreated            = "created"
	ActivityTitleChanged       = "title_changed"
	ActivityDescriptionChanged = "description_changed"
	ActivityStatusChanged      = "status_changed"
	ActivityPriorityChanged    = "priority_changed"
	ActivityAssigneeChanged    = "assignee_changed"
	ActivityLabelAdded         = "label_added"
	ActivityLabelRemoved       = "label_removed"
)

const (
	AssigneeActionAssigned   = "assigned"
	AssigneeActionUnassigned = "unassigned"
)

type IssueActivity struct {
	ID        int64           `json:"id"`
	IssueID   int64           `json:"issue_id"`
	Type      string          `json:"type"`
	ActorID   string          `json:"actor_id"`
	Actor     *UserSummary    `json:"actor,omitempty"`
	Payload   json.RawMessage `json:"payload" swaggertype:"object"`
	CreatedAt time.Time       `json:"created_at"`
}

type ActivityStore struct {
	db *sql.DB
}

type change struct {
	Type    string
	Payload any
}

func recordActivity(ctx context.Context, tx *sql.Tx, issueID int64, actorID string, c change) error {
	payload := []byte("{}")

	if c.Payload != nil {
		encoded, err := json.Marshal(c.Payload)

		if err != nil {
			return err
		}

		payload = encoded
	}

	query := `
		INSERT INTO issue_activities (issue_id, type, actor_id, payload)
		VALUES ($1, $2::issue_activity_type, $3, $4::jsonb)
	`

	_, err := tx.ExecContext(ctx, query, issueID, c.Type, actorID, string(payload))

	return err
}

func (s *ActivityStore) ListByIssue(ctx context.Context, issueID int64) ([]*IssueActivity, error) {
	query := `
		SELECT a.id, a.issue_id, a.type, a.actor_id, a.payload, a.created_at,
			u.id, u.name, u.email
		FROM issue_activities a
		INNER JOIN users u ON u.id = a.actor_id
		WHERE a.issue_id = $1
		ORDER BY a.created_at, a.id
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	rows, err := s.db.QueryContext(ctx, query, issueID)

	if err != nil {
		return nil, err
	}

	defer rows.Close()

	activities := []*IssueActivity{}

	for rows.Next() {
		var (
			activity IssueActivity
			actor    UserSummary
			payload  []byte
		)

		err := rows.Scan(
			&activity.ID,
			&activity.IssueID,
			&activity.Type,
			&activity.ActorID,
			&payload,
			&activity.CreatedAt,
			&actor.ID,
			&actor.Name,
			&actor.Email,
		)

		if err != nil {
			return nil, err
		}

		activity.Payload = json.RawMessage(payload)
		activity.Actor = &actor

		activities = append(activities, &activity)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return activities, nil
}
