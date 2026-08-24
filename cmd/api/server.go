package main

import (
	"net/http"
	"time"
)

func (app *application) serve() error {
	srv := &http.Server{
		Addr:         app.config.addr,
		Handler:      app.routes(),
		IdleTimeout:  time.Minute,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
	}

	app.logger.Infof("server starting on %s (env: %s)", app.config.addr, app.config.env)

	return srv.ListenAndServe()
}
