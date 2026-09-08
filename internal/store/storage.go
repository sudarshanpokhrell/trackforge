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
		GetById(context.Context, string) (*User, error)
		GetByEmail(context.Context, string) (*User, error)
	}

	Projects interface {
		Create(context.Context, *Project) error
		GetByID(ctx context.Context, projectID int64) (*Project, error)
		GetProjectDetails(ctx context.Context, projectID int64) (*ProjectDetails, error)
		GetProjectsByUserID(ctx context.Context, userID string) ([]*Project, error)
		Update(context.Context, *Project) error
		UpdateLead(ctx context.Context, projectID int64, leadID *string) (*Project, error)
		Delete(ctx context.Context, projectID int64) error
	}

	Memberships interface {
		Create(ctx context.Context, userID, role string, projectID int64) error
		GetRole(ctx context.Context, userID string, projectID int64) (string, error)
		UpdateRole(ctx context.Context, userID, role string, projectID int64) error
		Delete(ctx context.Context, userID string, projectID int64) error
	}
	Issues interface {
		Create(context.Context, *Issue) error
		GetByID(ctx context.Context, issueID int64) (*Issue, error)
		ListByProject(ctx context.Context, projectID int64) ([]*Issue, error)
		Update(ctx context.Context, issue *Issue, before Issue, actorID string) error
		AddAssignee(ctx context.Context, issueID int64, userID, actorID string) error
		RemoveAssignee(ctx context.Context, issueID int64, userID, actorID string) error
		Delete(ctx context.Context, issueID int64) error
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
		Activities:  &ActivityStore{db},

		IssueComments: &IssueCommentStore{db},
	}
}
