package realtime

import "sync"

const clientBuffer = 30

type Client struct {
	ClientID string
	UserID   string

	events chan Event
	done   chan struct{}

	closeOnce sync.Once

	mu       sync.RWMutex
	all      bool
	projects map[int64]struct{}
}

func (c *Client) Events() <-chan Event { return c.events }

func (c *Client) Closed() <-chan struct{} { return c.done }

func (c *Client) close() {
	c.closeOnce.Do(func() { close(c.done) })
}

func (c *Client) setAccess(a Access) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.all = a.All
	c.projects = a.ProjectIDs
}

func (c *Client) canSee(projectID int64) bool {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.all {
		return true
	}

	_, ok := c.projects[projectID]
	return ok
}

func (c *Client) forgetProject(projectID int64) {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.projects, projectID)
}

func (c *Client) wants(e Event) bool {
	switch {
	case e.UserID != "":
		return c.UserID == e.UserID
	case e.ProjectID != 0:
		return c.canSee(e.ProjectID)
	default:
		return true
	}
}

func (c *Client) send(e Event) {
	select {
	case c.events <- e:
	default:
		c.close()
	}
}

func newClient(userID, clientID string, access Access) *Client {
	c := &Client{
		UserID:   userID,
		ClientID: clientID,
		events:   make(chan Event, clientBuffer),
		done:     make(chan struct{}),
	}
	c.setAccess(access)
	return c
}
