package store

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

var QueryTimeOutDuration = 3 * time.Second
var ErrNotFound = errors.New("Resource not found")

type Storage struct {
	Users interface {
		Create(context.Context, *User) error
		GetById(context.Context, string) (*User, error)
		GetByEmail(context.Context, string) (*User, error)
	}

	Projects interface {
		Create(context.Context, *Project) error
		GetProjectDetails(context.Context, int64) (*ProjectDetails, error)
		GetProjectsByUserID(context.Context, string) ([]*Project, error)
		GetByID(context.Context, int64) (*Project, error)
		Update(context.Context, int64, *Project) error
		Delete(context.Context, int64) error
	}
}

func NewStorage(db *sql.DB) Storage {
	return Storage{
		Users:    &UserStore{db},
		Projects: &ProjectStore{db},
	}
}
