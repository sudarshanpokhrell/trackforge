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
		GetById(context.Context, int64) (*User, error)
		GetByEmail(context.Context, string) (*User, error)
	}
}

func NewStorage(db *sql.DB) Storage {
	return Storage{
		Users: &UserStore{db},
	}
}
