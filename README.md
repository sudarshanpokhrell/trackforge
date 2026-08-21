# Trackforge

A cloud-native project management and issue tracking system built with a Go backend and a React (Vite + TanStack Router + Tailwind CSS) frontend.
---

## Tech Stack

- **Backend:** Go, Chi router, PostgreSQL, Zap logger
- **Frontend:** React 19, TypeScript, Vite, TanStack Router, Tailwind CSS v4, shadcn/ui
- **Database:** PostgreSQL, Redis

---

## Getting Started

### 1. Setup Environment
```bash
cp .env.example .env
```

### 2. Start PostgreSQL
```bash
make docker-up
```

### 3. Run Application
```bash
make run
```
Access the application at `http://localhost:8080`.

---

## Development

### Frontend with Hot-Reload (Vite)
For rapid UI development with instant hot-reloading (HMR):

```bash
cd web
bun dev
```
Frontend runs at `http://localhost:5173` and automatically proxies `/api` calls to the Go backend on `:8080`.

---

## Production Build

Build both frontend assets and the Go binary into a single standalone executable:

```bash
make build
```
The output binary will be generated at `./bin/api`.

---

## Useful Commands

| Command | Description |
| :--- | :--- |
| `make run` | Run Go application locally |
| `make build` | Build frontend + Go binary |
| `make test` | Run all tests |
| `make docker-up` | Start PostgreSQL container |
| `make docker-down` | Stop PostgreSQL container |
| `make docker-logs` | View database container logs |
| `make migrate-up` | Apply database migrations |
| `make migrate-down` | Rollback database migrations |
| `make migrate-create name=<name>` | Create a new SQL migration file |
