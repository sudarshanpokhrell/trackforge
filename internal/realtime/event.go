package realtime

// Event types. The frontend listens for exactly these names (web/src/types/realtime.ts),
// so change both together.
const (
	TypeIssueCreated           = "issue.created"
	TypeIssueUpdated           = "issue.updated"
	TypeIssueDeleted           = "issue.deleted"
	TypeIssueCommentsChanged   = "issue.comments.changed"
	TypeProjectCommentsChanged = "project.comments.changed"
	TypeProjectCyclesChanged   = "project.cycles.changed"
	TypeProjectLabelsChanged   = "project.labels.changed"
	TypeProjectUpdated         = "project.updated"
	TypeProjectDeleted         = "project.deleted"
	TypeMembershipChanged      = "membership.changed"
	TypeUsersChanged           = "users.changed"
)

// Event says what changed, never what it changed to. Viewers refetch through
// the normal API, which keeps permissions in one place.
//
// Who receives it:
//   - UserID set:    only that user's connections
//   - ProjectID set: connections that can see the project
//   - neither:       every connection
type Event struct {
	Type      string `json:"type"`
	ProjectID int64  `json:"project_id,omitempty"`
	IssueID   int64  `json:"issue_id,omitempty"`
	UserID    string `json:"user_id,omitempty"`
	ActorID   string `json:"actor_id"`            // the user who made the change
	ClientID  string `json:"client_id,omitempty"` // the tab that made it, so that tab can skip it
}
