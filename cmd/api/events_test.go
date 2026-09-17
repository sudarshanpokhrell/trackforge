package main

import (
	"bufio"
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/sudarshanpokhrell/trackforge/internal/auth"
	"github.com/sudarshanpokhrell/trackforge/internal/realtime"
	"github.com/sudarshanpokhrell/trackforge/internal/store"
	"go.uber.org/zap"
)

const testUserID = "3f1d6a2e-8b4c-4e1a-9c7d-2b5e8f0a1c3d"

// newStreamServer runs the real eventsHandler with no database: the hub gets a
// fake access loader, and the user goes straight into the request context.
func newStreamServer(t *testing.T, tokenTTL time.Duration) (*realtime.Hub, *http.Response) {
	t.Helper()
	logger := zap.NewNop().Sugar()

	hub := realtime.NewHub(func(context.Context, string) (realtime.Access, error) {
		return realtime.Access{ProjectIDs: map[int64]struct{}{7: {}}}, nil
	}, logger)
	t.Cleanup(hub.Close)

	authenticator := auth.NewJWTAuthenticator("test-secret", "trackforge", "trackforge")
	app := &application{realtime: hub, authenticator: authenticator, logger: logger}

	user := &store.User{ID: testUserID}

	token, err := authenticator.GenerateToken(jwt.MapClaims{
		"sub": user.ID,
		"exp": time.Now().Add(tokenTTL).Unix(),
		"iss": "trackforge",
		"aud": "trackforge",
	})
	if err != nil {
		t.Fatal(err)
	}

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := context.WithValue(r.Context(), userCtx, user)
		app.eventsHandler(w, r.WithContext(ctx))
	}))
	t.Cleanup(srv.Close)

	client := srv.Client()
	client.Timeout = 5 * time.Second

	req, _ := http.NewRequest(http.MethodGet, srv.URL, nil)
	req.Header.Set("Authorization", "Bearer "+token)

	res, err := client.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { res.Body.Close() })

	if ct := res.Header.Get("Content-Type"); ct != "text/event-stream" {
		t.Fatalf("Content-Type = %q", ct)
	}

	return hub, res
}

func TestEventsHandlerStreamsEvents(t *testing.T) {
	hub, res := newStreamServer(t, time.Hour)
	lines := bufio.NewScanner(res.Body)

	// Written after Subscribe, so the hub now knows about this stream.
	readUntil(t, lines, "retry: 3000")

	hub.Publish(realtime.Event{Type: realtime.TypeIssueUpdated, ProjectID: 7, IssueID: 42})
	readUntil(t, lines, "event: issue.updated")

	hub.Publish(realtime.Event{Type: realtime.TypeIssueUpdated, ProjectID: 99})
	hub.Publish(realtime.Event{Type: realtime.TypeIssueDeleted, ProjectID: 7, IssueID: 42})
	if line := nextEventLine(t, lines); line != "event: issue.deleted" {
		t.Fatalf("got %q; the project 99 event should have been filtered out", line)
	}
}

func TestEventsHandlerEndsWhenTokenExpires(t *testing.T) {
	// JWT expiry has one-second resolution, so this lands one to two seconds out.
	_, res := newStreamServer(t, 2*time.Second)
	lines := bufio.NewScanner(res.Body)

	readUntil(t, lines, "retry: 3000")

	for lines.Scan() {
		if strings.HasPrefix(lines.Text(), "event:") {
			t.Fatalf("unexpected %q", lines.Text())
		}
	}

	if err := lines.Err(); err != nil {
		t.Fatalf("stream did not end cleanly: %v", err)
	}
}

func readUntil(t *testing.T, s *bufio.Scanner, want string) {
	t.Helper()
	for s.Scan() {
		if s.Text() == want {
			return
		}
	}
	t.Fatalf("stream ended before %q (err: %v)", want, s.Err())
}

func nextEventLine(t *testing.T, s *bufio.Scanner) string {
	t.Helper()
	for s.Scan() {
		if line := s.Text(); strings.HasPrefix(line, "event:") {
			return line
		}
	}
	t.Fatalf("stream ended (err: %v)", s.Err())
	return ""
}
