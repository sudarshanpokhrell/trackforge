package realtime

import "context"

type Broker interface {
	Subscribe(ctx context.Context, userID, clientID string) (*Client, error)
	Unsubscribe(c *Client)
	Publish(e Event)
	DisconnectUser(userID string)
	Close()
}
