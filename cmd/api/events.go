package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/sudarshanpokhrell/trackforge/internal/realtime"
	"github.com/sudarshanpokhrell/trackforge/internal/store"
	"github.com/sudarshanpokhrell/trackforge/internal/validator"
)

const clientIDHeader = "X-Client-ID"

// streamPingInterval keeps proxies from closing a stream that has been quiet.
// Most drop idle connections after 60s.
const streamPingInterval = 25 * time.Second

// @Summary Stream change events
// @Description Server-Sent Events. Each event names what changed (type and ids), not the new data; refetch it through the normal endpoints. The stream ends when the token expires.
// @Tags events
// @Produce text/event-stream
// @Param client_id query string false "Per-tab UUID. Events caused by requests that sent the same X-Client-ID header carry it, so that tab can skip them."
// @Success 200 {string} string "text/event-stream"
// @Failure 401 {object} error
// @Failure 403 {object} error
// @Security BearerAuth
// @Router /events [get]
func (app *application) eventsHandler(w http.ResponseWriter, r *http.Request) {
	user := app.contextUser(r)

	expiresAt, err := app.tokenExpiry(r)

	if err != nil {
		app.invalidAuthenticationResponse(w, r)
		return
	}

	clientID := r.URL.Query().Get("client_id")

	if !validator.UUIDRX.MatchString(clientID) {
		clientID = ""
	}

	rc := http.NewResponseController(w)

	// server.go sets WriteTimeout: 30s, which would cut every stream at 30s.
	// A zero deadline turns it off for this response only.
	if err := rc.SetWriteDeadline(time.Time{}); err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	client, err := app.realtime.Subscribe(r.Context(), user.ID, clientID)

	if err != nil {
		switch {
		case errors.Is(err, realtime.ErrClosed):
			app.errorResponse(w, r, http.StatusServiceUnavailable, "server is shutting down")
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	defer app.realtime.Unsubscribe(client)

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("X-Accel-Buffering", "no") // nginx: don't buffer this response
	w.WriteHeader(http.StatusOK)

	// How long the browser waits before reconnecting after a dropped stream.
	fmt.Fprint(w, "retry: 3000\n\n")

	if err := rc.Flush(); err != nil {
		return
	}

	ping := time.NewTicker(streamPingInterval)
	defer ping.Stop()

	// When the token expires the stream ends. The browser's reconnect then gets
	// a 401, and the frontend logs the user out.
	expired := time.NewTimer(time.Until(expiresAt))
	defer expired.Stop()

	for {
		select {
		case <-r.Context().Done():
			return
		case <-client.Closed():
			return
		case <-expired.C:
			return
		case <-ping.C:
			fmt.Fprint(w, ": ping\n\n")
		case e := <-client.Events():
			data, err := json.Marshal(e)

			if err != nil {
				app.logger.Errorw("realtime: encoding event", "type", e.Type, "error", err)
				continue
			}

			fmt.Fprintf(w, "event: %s\ndata: %s\n\n", e.Type, data)
		}

		if err := rc.Flush(); err != nil {
			return
		}
	}
}

// publish sends e to everyone who should hear about it, stamped with who made
// the change and from which tab. Call it only after the write has succeeded.
func (app *application) publish(r *http.Request, e realtime.Event) {
	e.ActorID = app.contextUserID(r)

	if id := r.Header.Get(clientIDHeader); validator.UUIDRX.MatchString(id) {
		e.ClientID = id
	}

	app.realtime.Publish(e)
}

func (app *application) tokenExpiry(r *http.Request) (time.Time, error) {
	token, err := tokenFromRequest(r)

	if err != nil {
		return time.Time{}, err
	}

	jwtToken, err := app.authenticator.ValidateToken(token)

	if err != nil {
		return time.Time{}, err
	}

	exp, err := jwtToken.Claims.GetExpirationTime()

	if err != nil || exp == nil {
		return time.Time{}, errors.New("token has no expiry")
	}

	return exp.Time, nil
}

// loadRealtimeAccess is the hub's AccessLoader. It uses the same visibility
// rule as GET /projects (ListVisibleTo), so the stream never reaches further
// than the API does.
func (app *application) loadRealtimeAccess(ctx context.Context, userID string) (realtime.Access, error) {
	user, err := app.store.Users.GetById(ctx, userID)

	if err != nil {
		return realtime.Access{}, err
	}

	if user.Role == store.UserRoleSuperadmin {
		return realtime.Access{All: true}, nil
	}

	projects, err := app.store.Projects.ListVisibleTo(ctx, userID, false)

	if err != nil {
		return realtime.Access{}, err
	}

	ids := make(map[int64]struct{}, len(projects))

	for _, p := range projects {
		ids[p.ID] = struct{}{}
	}

	return realtime.Access{ProjectIDs: ids}, nil
}
