// Command admin is the recovery tool for a self-hosted install, run on the
// server itself. It talks to the database directly, so it works even when
// nobody can log in.
//
//	go run ./cmd/admin reset-password --email x@y.z
package main

import (
	"context"
	"crypto/rand"
	"errors"
	"flag"
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	"github.com/sudarshanpokhrell/trackforge/internal/db"
	"github.com/sudarshanpokhrell/trackforge/internal/env"
	"github.com/sudarshanpokhrell/trackforge/internal/store"
)

const usage = `Usage: go run ./cmd/admin <command> [flags]

Commands:
  reset-password --email <email>   Set a temporary password and print it`

func main() {
	log.SetFlags(0)

	if len(os.Args) < 2 {
		log.Fatal(usage)
	}

	godotenv.Load()

	switch os.Args[1] {
	case "reset-password":
		resetPassword(os.Args[2:])
	default:
		log.Fatal(usage)
	}
}

func resetPassword(args []string) {
	fs := flag.NewFlagSet("reset-password", flag.ExitOnError)
	email := fs.String("email", "", "email of the user whose password to reset")
	fs.Parse(args)

	if *email == "" {
		log.Fatal("--email is required")
	}

	database, err := db.New(
		env.GetString("DB_ADDR", "postgres://postgres:postgres@localhost:5432/trackforge?sslmode=disable"),
		1, 1, "1m",
	)

	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer database.Close()

	users := store.NewStorage(database).Users
	ctx := context.Background()

	user, err := users.GetByEmail(ctx, *email)

	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			log.Fatalf("no user with email %q", *email)
		}
		log.Fatalf("failed to load user: %v", err)
	}

	temporary := rand.Text()

	if err := user.Password.Set(temporary); err != nil {
		log.Fatalf("failed to hash password: %v", err)
	}

	user.MustChangePassword = true

	if err := users.Update(ctx, user); err != nil {
		log.Fatalf("failed to save user: %v", err)
	}

	fmt.Printf("Temporary password for %s (%s): %s\n", user.Email, user.Role, temporary)
	fmt.Println("They must change it after logging in.")

	if !user.IsActive {
		fmt.Println("Note: this account is deactivated and can't log in until a superadmin reactivates it.")
	}
}
