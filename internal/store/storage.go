package store

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

var QueryTimeOutDuration = 3 * time.Second

var (
	ErrNotFound     = errors.New("resource not found")
	ErrEditConflict = errors.New("edit conflict, please retry")
)

type Storage struct {
	Users interface {
		Create(context.Context, *User) error
		SuperadminExists(context.Context) (bool, error)
		GetById(context.Context, string) (*User, error)
		GetByEmail(context.Context, string) (*User, error)
		List(ctx context.Context, active *bool) ([]*User, error)
		Update(context.Context, *User) error
		TransferSuperadmin(ctx context.Context, fromID, toID string) error
	}

	Projects interface {
		Create(context.Context, *Project) error
		Exists(ctx context.Context, projectID int64) (bool, error)
		GetByID(ctx context.Context, projectID int64) (*Project, error)
		GetProjectDetails(ctx context.Context, projectID int64) (*ProjectDetails, error)
		ListVisibleTo(ctx context.Context, userID string, all bool) ([]*Project, error)
		ListSoleActiveAdminOf(ctx context.Context, userID string) ([]ProjectRef, error)
		Update(context.Context, *Project) error
		Delete(ctx context.Context, projectID int64) error
	}

	Memberships interface {
		Create(ctx context.Context, userID string, projectID int64, role string) error
		GetRole(ctx context.Context, userID string, projectID int64) (string, error)
		UpdateRole(ctx context.Context, userID string, projectID int64, role string) error
		Delete(ctx context.Context, userID string, projectID int64) error
	}
	Issues interface {
		Create(ctx context.Context, issue *Issue, labelIDs []int64) error
		GetByID(ctx context.Context, issueID int64) (*Issue, error)
		ListByProject(ctx context.Context, projectID int64) ([]*Issue, error)
		Update(ctx context.Context, issue *Issue, before Issue, actorID string) error
		AddAssignee(ctx context.Context, issueID, projectID int64, userID, actorID string) error
		RemoveAssignee(ctx context.Context, issueID int64, userID, actorID string) error
		AddLabel(ctx context.Context, issueID, projectID, labelID int64, actorID string) (LabelSummary, bool, error)
		RemoveLabel(ctx context.Context, issueID, labelID int64, actorID string) error
		Delete(ctx context.Context, issueID int64) error
	}

	Labels interface {
		Create(context.Context, *Label) error
		GetByID(ctx context.Context, labelID int64) (*Label, error)
		ListByProject(ctx context.Context, projectID int64) ([]*Label, error)
		Update(context.Context, *Label) error
		Delete(ctx context.Context, labelID int64) (int64, error)
	}

	Activities interface {
		ListByIssue(ctx context.Context, issueID int64) ([]*IssueActivity, error)
	}

	IssueComments interface {
		Create(context.Context, *IssueComment) error
		GetByIssueID(ctx context.Context, issueID int64) ([]*IssueComment, error)
		GetByID(ctx context.Context, commentID int64) (*IssueComment, error)
		Update(context.Context, *IssueComment) error
		Delete(ctx context.Context, commentID int64) error
	}

	Comments interface {
		Create(context.Context, *ProjectComment) error
		GetByProjectID(ctx context.Context, projectID int64) ([]*ProjectComment, error)
		GetProjectCommentByID(ctx context.Context, commentID int64) (*ProjectComment, error)
		Update(context.Context, *ProjectComment) error
		Delete(ctx context.Context, commentID int64) error
	}
}

func NewStorage(db *sql.DB) Storage {
	return Storage{
		Users:       &UserStore{db},
		Projects:    &ProjectStore{db},
		Memberships: &MembershipStore{db},
		Comments:    &CommentStore{db},
		Issues:      &IssueStore{db},
		Labels:      &LabelStore{db},
		Activities:  &ActivityStore{db},

		IssueComments: &IssueCommentStore{db},
	}
}
