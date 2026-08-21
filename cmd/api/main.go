package main

import (
	"fmt"

	"github.com/sudarshanpokhrell/trackforge/internal/db"
	"github.com/sudarshanpokhrell/trackforge/internal/store"
	"go.uber.org/zap"
)

const version = "1.0.0"

type config struct {
	port int
	env  string
	db   struct {
		dsn          string
		maxOpenConns int
		maxIdleConns int
		maxIdleTime  string
	}
}

type application struct {
	config config
	store  store.Storage
	logger *zap.SugaredLogger
}

func main() {
	cfg := config{
		port: 8080,
		env:  "development",
	}
	fmt.Println("welcome to trackforge")

	logger := zap.Must(zap.NewProduction()).Sugar()

	db, err := db.New(cfg.db.dsn, cfg.db.maxOpenConns, cfg.db.maxIdleConns, cfg.db.maxIdleTime)

	if err != nil {
		logger.Fatal(err)
	}

	app := &application{
		config: cfg,
		logger: logger,
		store:  store.NewStorage(db),
	}

	err = app.serve()

	if err != nil {
		logger.Fatalf(err.Error(), nil)
	}
}
