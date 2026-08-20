package store

import (
	"database/sql"
	"time"
)

var QueryTimeOutDuration = 3 * time.Second

type Storage struct {
}

func NewStorage(db *sql.DB) Storage {
	return Storage{}
}
