package main

import (
	"fmt"
	"io/fs"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/sudarshanpokhrell/trackforge/web"
)

func (app *application) routes() http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.Recoverer)
	r.Use(middleware.Logger)
	r.Use(middleware.RequestID)

	// API Routes
	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			fmt.Fprintf(w, `{"status":"ok","version":%q,"env":%q}`, version, app.config.env)
		})
	})

	// Static & SPA Frontend Serving
	distFS, err := fs.Sub(web.DistFS, "dist")
	if err != nil {
		app.logger.Warnf("failed to load embedded frontend files: %v", err)
		return r
	}

	fileServer := http.FileServer(http.FS(distFS))

	r.Get("/*", func(w http.ResponseWriter, r *http.Request) {
		path := filepath.Clean(r.URL.Path)
		path = strings.TrimPrefix(path, "/")

		if path == "" {
			path = "index.html"
		}

		// Check if file exists in the embedded filesystem
		f, err := distFS.Open(path)
		if err != nil {
			if os.IsNotExist(err) {
				// Return 404 for missing static assets (e.g. missing .js/.css/.png)
				if filepath.Ext(path) != "" {
					http.NotFound(w, r)
					return
				}
				// Fallback to index.html for client-side SPA routes (e.g. /about, /dashboard)
				r.URL.Path = "/"
			}
		} else {
			_ = f.Close()
		}

		fileServer.ServeHTTP(w, r)
	})

	return r
}
