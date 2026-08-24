package main

import (
	"io/fs"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	_ "github.com/sudarshanpokhrell/trackforge/docs"
	"github.com/sudarshanpokhrell/trackforge/web"
	httpSwagger "github.com/swaggo/http-swagger/v2"
)

func (app *application) routes() http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.Recoverer)
	r.Use(middleware.Logger)
	r.Use(middleware.RequestID)

	// API Routes
	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/health", app.healthcheckHandler)
		r.Route("/auth", func(r chi.Router) {
			r.Post("/register", app.registerUserHandler)
			r.Post("/login", app.loginUserHandler)
		})
		r.Route("/projects", func(r chi.Router) {
			r.Use(app.AuthTokenMiddleware)
			r.Post("/", app.createProjectHandler)
			r.Get("/", app.getUserProjectsHandler)
			r.Get("/{id}", app.getProjectByIDHandler)
			r.Put("/{id}", app.updateProjectHandler)
			r.Delete("/{id}", app.deleteProjectHandler)

			r.Route("/{id}/members", func(r chi.Router) {
				r.Post("/", app.addProjectMemberHandler)
				r.Patch("/{userID}", app.updateProjectMemberRoleHandler)
				r.Delete("/{userID}", app.removeProjectMemberHandler)
			})
		})
		r.Get("/docs/*", httpSwagger.Handler(
			httpSwagger.URL("/api/v1/docs/doc.json"),
			// Without this the Authorize value is discarded on every page reload.
			httpSwagger.PersistAuthorization(true),
		))
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
