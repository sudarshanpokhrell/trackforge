package main

import (
	"time"

	"github.com/joho/godotenv"
	"github.com/sudarshanpokhrell/trackforge/internal/auth"
	"github.com/sudarshanpokhrell/trackforge/internal/db"
	"github.com/sudarshanpokhrell/trackforge/internal/env"
	"github.com/sudarshanpokhrell/trackforge/internal/store"
	"go.uber.org/zap"
)

const version = "1.0.0"

type config struct {
	addr string
	env  string
	db   struct {
		dsn          string
		maxOpenConns int
		maxIdleConns int
		maxIdleTime  string
	}
	token struct {
		secret string
		exp    time.Duration
		iss    string
	}

	auth struct {
		basic struct {
			user string
			pass string
		}
	}
	mail struct {
		fromEmail      string
		sendGridAPIKey string
	}
}

type application struct {
	config        config
	store         store.Storage
	logger        *zap.SugaredLogger
	authenticator auth.Authenticator
}

// @title Trackforge API
// @version 1.0
// @description API for Trackforge application.
// @host localhost:8080
// @BasePath /api/v1
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description JWT from POST /auth/login. Paste it with the scheme included, e.g. "Bearer eyJhbGciOi..."
func main() {
	godotenv.Load()

	var cfg config
	cfg.addr = env.GetString("ADDR", ":"+env.GetString("PORT", "8080"))
	cfg.env = env.GetString("ENV", "development")

	cfg.db.dsn = env.GetString("DB_ADDR", "postgres://postgres:postgres@localhost:5432/trackforge?sslmode=disable")
	cfg.db.maxOpenConns = env.GetInt("DB_MAX_OPEN_CONN", 30)
	cfg.db.maxIdleConns = env.GetInt("DB_MAX_IDLE_CONN", 30)
	cfg.db.maxIdleTime = env.GetString("DB_MAX_IDLE_TIME", "15m")

	cfg.token.secret = env.GetString("TOKEN_SECRET", "this-is-very-secret")
	cfg.token.exp = env.GetDuration("TOKEN_EXP", time.Hour*24*3)
	cfg.token.iss = env.GetString("TOKEN_ISS", "trackforge")

	var zapLogger *zap.Logger
	var err error
	if cfg.env == "development" {
		zapLogger, err = zap.NewDevelopment()
	} else {
		zapLogger, err = zap.NewProduction()
	}

	if err != nil {
		panic(err)
	}
	logger := zapLogger.Sugar()

	defer logger.Sync()

	logger.Infof("starting trackforge API v%s", version)

	database, err := db.New(cfg.db.dsn, cfg.db.maxOpenConns, cfg.db.maxIdleConns, cfg.db.maxIdleTime)

	if err != nil {
		logger.Fatalf("failed to connect to database: %v", err)
	}
	defer database.Close()

	logger.Info("database connection pool established")

	jwtAuthenticator := auth.NewJWTAuthenticator(cfg.token.secret, cfg.token.iss, cfg.token.iss)

	app := &application{
		config:        cfg,
		logger:        logger,
		store:         store.NewStorage(database),
		authenticator: jwtAuthenticator,
	}

	if err := app.serve(); err != nil {
		logger.Fatalf("server error: %v", err)
	}
}
