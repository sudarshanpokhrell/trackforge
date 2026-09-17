package realtime

import (
	"context"
	"errors"
	"sync"
	"time"

	"go.uber.org/zap"
)

var ErrClosed = errors.New("realtime: hub is closed")

type Access struct {
	All        bool
	ProjectIDs map[int64]struct{}
}

type AccessLoader func(ctx context.Context, userID string) (Access, error)

type Hub struct {
	load   AccessLoader
	logger *zap.SugaredLogger

	mu sync.RWMutex

	clients map[*Client]struct{}
	closed  bool
}

func NewHub(load AccessLoader, logger *zap.SugaredLogger) *Hub {
	return &Hub{
		load:    load,
		logger:  logger,
		clients: make(map[*Client]struct{}),
	}
}

func (h *Hub) Subscribe(ctx context.Context, userID, clientID string) (*Client, error) {
	access, err := h.load(ctx, userID)

	if err != nil {
		return nil, err
	}

	c := newClient(userID, clientID, access)

	h.mu.Lock()
	defer h.mu.Unlock()

	if h.closed {
		return nil, ErrClosed
	}

	h.clients[c] = struct{}{}

	return c, nil
}

func (h *Hub) Unsubscribe(c *Client) {
	h.mu.Lock()
	delete(h.clients, c)
	h.mu.Unlock()

	c.close()
}

func (h *Hub) Publish(e Event) {
	// The user's project set must change before the event reaches them, and
	// that needs the database, so it runs off the caller's goroutine.
	if e.Type == TypeMembershipChanged {
		go h.refreshThenSend(e)
		return
	}

	h.mu.RLock()
	defer h.mu.RUnlock()

	for c := range h.clients {
		if c.wants(e) {
			c.send(e)
		}
	}

	// The event above went out while members could still see the project.
	// Nobody can after this.
	if e.Type == TypeProjectDeleted {
		for c := range h.clients {
			c.forgetProject(e.ProjectID)
		}
	}
}

func (h *Hub) refreshThenSend(e Event) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	access, err := h.load(ctx, e.UserID)

	if err != nil {
		h.logger.Warnw("realtime: reloading access failed, closing the user's streams", "user_id", e.UserID, "error", err)
	}

	h.mu.RLock()
	defer h.mu.RUnlock()

	for c := range h.clients {
		if c.UserID != e.UserID {
			continue
		}

		if err != nil {
			// It reconnects and loads its access from scratch.
			c.close()
			continue
		}

		c.setAccess(access)
		c.send(e)
	}
}

func (h *Hub) DisconnectUser(userID string) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	for c := range h.clients {
		if c.UserID == userID {
			c.close()
		}
	}
}

func (h *Hub) Close() {
	h.mu.Lock()
	defer h.mu.Unlock()

	h.closed = true

	for c := range h.clients {
		c.close()
	}
}
