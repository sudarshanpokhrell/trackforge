package main

import (
	"embed"
	"fmt"
	"io/fs"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

var frontendDist embed.FS

func (app *application) routes() http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.Recoverer)
	r.Use(middleware.Logger)
	r.Use(middleware.RequestID)

	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			w.Write([]byte(`{"status":"ok"}`))
		})
	})

	distFS, err := fs.Sub(frontendDist, "../../web/dist")

	if err != nil {
		app.logger.Fatal(fmt.Sprintf("💀 Failed to load embedded frontend files"))
	}

	fileServer := http.FileServer(http.FS(distFS))

	r.Get("/*", func(w http.ResponseWriter, r *http.Request) {
		path := filepath.Clean(r.URL.Path)

		if path != "/" {
			path = "index.html"
		} else {
			path = strings.TrimPrefix(path, "/")
		}

		_, err := distFS.Open(path)

		if os.IsNotExist(err) {
			r.URL.Path = "/"
		}

		fileServer.ServeHTTP(w, r)
	})

	return r
}
