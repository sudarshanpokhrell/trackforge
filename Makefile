-include .env
-include .envrc

MIGRATIONS_PATH = ./cmd/migrate/migrations

# Default target
.PHONY: help
help:
	@echo "Trackforge Makefile commands:"
	@echo "  make run             - Run Go API locally"
	@echo "  make build-web       - Build frontend"
	@echo "  make build           - Build Go API binary"
	@echo "  make test            - Run all tests"
	@echo "  make docker-up       - Start local testing dependencies (PostgreSQL)"
	@echo "  make docker-down     - Stop local testing containers"
	@echo "  make docker-logs     - Follow Docker container logs"
	@echo "  make migration       - Create a new migration file (usage: make migration name=add_users)"
	@echo "  make migrate-up      - Run pending migrations (usage: make migrate-up [steps=1])"
	@echo "  make migrate-down    - Rollback migrations (usage: make migrate-down [steps=1])"
	@echo "  make swagger         - Regenerate Swagger docs from code annotations"

.PHONY: run
run:
	@go run ./cmd/api

.PHONY: build-web
build-web:
	@cd web && bun run build

.PHONY: build
build: build-web
	@go build -o bin/api ./cmd/api

.PHONY: test
test:
	@go test -v ./...

#swagger docs
.PHONY: swagger
swagger:
	@swag init -g cmd/api/main.go -o docs --parseInternal

#docker commands
.PHONY: docker-up
docker-up:
	docker compose up -d

.PHONY: docker-down
docker-down:
	docker compose down


.PHONY: docker-logs
docker-logs:
	docker compose logs -f

#migrations
.PHONY: migration
migration:
	@test -n "$(name)" || (echo "Usage: make migration name=add_users" && exit 1)
	@migrate create -seq -ext sql -dir $(MIGRATIONS_PATH) $(name)

.PHONY: migrate-up
migrate-up:
	@go run ./cmd/migrate up $(steps)

.PHONY: migrate-down
migrate-down:
	@go run ./cmd/migrate down $(steps)
