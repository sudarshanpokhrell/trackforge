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
	@echo "  make migrate-create  - Create a new migration file (usage: make migration name=add_users)"
	@echo "  make migrate-up      - Run all pending database migrations locally"
	@echo "  make migrate-down    - Rollback database migrations locally"

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
	@migrate create -seq -ext sql -dir $(MIGRATIONS_PATH) $(filter-out $@,$(MAKECMDGOALS))

.PHONY: migrate-up
migrate-up:
	@migrate -path=$(MIGRATIONS_PATH) -database="$(DB_ADDR)" up

.PHONY: migrate-down
migrate-down:
	@migrate -path=$(MIGRATIONS_PATH) -database="$(DB_ADDR)" down $(filter-out $@,$(MAKECMDGOALS))
