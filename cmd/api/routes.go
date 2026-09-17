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
	"github.com/sudarshanpokhrell/trackforge/internal/store"
	"github.com/sudarshanpokhrell/trackforge/web"
	httpSwagger "github.com/swaggo/http-swagger/v2"
)

func (app *application) routes() http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.Recoverer)
	r.Use(middleware.RequestID)
	r.Use(middleware.Logger)

	// API Routes
	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/health", app.healthcheckHandler)
		r.Get("/setup", app.getSetupStatusHandler)
		r.Post("/setup", app.setupHandler)
		r.Route("/auth", func(r chi.Router) {
			r.Post("/login", app.loginUserHandler)
			r.Post("/logout", app.logoutUserHandler)
		})
		r.With(app.RequireAuth).Get("/events", app.eventsHandler)
		r.Route("/me", func(r chi.Router) {
			r.Use(app.AuthTokenMiddleware)
			r.Get("/", app.getCurrentUserHandler)
			r.Patch("/", app.updateCurrentUserHandler)
			r.Post("/password", app.changePasswordHandler)
		})
		r.Route("/users", func(r chi.Router) {
			r.Use(app.RequireAuth)
			r.Get("/", app.listUsersHandler)

			r.Group(func(r chi.Router) {
				r.Use(app.RequireRole(store.UserRoleAdmin))
				r.Post("/", app.createUserHandler)
				r.Patch("/{userID}", app.updateUserHandler)
				r.Post("/{userID}/deactivate", app.deactivateUserHandler)
				r.Post("/{userID}/reactivate", app.reactivateUserHandler)
				r.Post("/{userID}/reset-password", app.resetUserPasswordHandler)
			})

			r.With(app.RequireRole(store.UserRoleSuperadmin)).Post("/{userID}/make-superadmin", app.makeSuperadminHandler)
		})
		r.Route("/issues", func(r chi.Router) {
			r.Use(app.RequireAuth)

			r.Route("/{issueID}", func(r chi.Router) {
				r.Use(app.RequireIssueAccess)

				r.Get("/", app.getIssueHandler)
				r.Get("/activities", app.listIssueActivitiesHandler)
				r.Get("/comments", app.listIssueCommentsHandler)

				r.Patch("/", app.updateIssueHandler)
				r.Post("/assignees", app.addIssueAssigneeHandler)
				r.Delete("/assignees/{userID}", app.removeIssueAssigneeHandler)
				r.Post("/labels", app.addIssueLabelHandler)
				r.Delete("/labels/{labelID}", app.removeIssueLabelHandler)
				r.Post("/comments", app.createIssueCommentHandler)

				r.Delete("/", app.deleteIssueHandler)

				r.Group(func(r chi.Router) {
					r.Use(app.LoadIssueComment)
					r.With(app.RequireIssueCommentAuthor).Patch("/comments/{commentID}", app.updateIssueCommentHandler)
					r.With(app.RequireIssueCommentAuthorOrProjectAdmin).Delete("/comments/{commentID}", app.deleteIssueCommentHandler)
				})
			})
		})

		r.Route("/projects", func(r chi.Router) {
			r.Use(app.RequireAuth)
			r.With(app.RequireRole(store.UserRoleAdmin)).Post("/", app.createProjectHandler)
			r.Get("/", app.listProjectsHandler)

			r.Route("/{id}", func(r chi.Router) {
				r.Use(app.RequireProjectAccess)

				r.Get("/", app.getProjectByIDHandler)

				r.Group(func(r chi.Router) {
					r.Use(app.RequireProjectAdmin)
					r.Put("/", app.updateProjectHandler)
					r.Delete("/", app.deleteProjectHandler)
					r.Post("/members", app.addProjectMemberHandler)
					r.Patch("/members/{userID}", app.updateProjectMemberHandler)
					r.Delete("/members/{userID}", app.removeProjectMemberHandler)
					r.Put("/cycles-enabled", app.setCyclesEnabledHandler)
				})

				r.Route("/labels", func(r chi.Router) {
					r.Get("/", app.listLabelsHandler)

					r.Group(func(r chi.Router) {
						r.Use(app.RequireProjectAdmin)
						r.Post("/", app.createLabelHandler)

						r.Route("/{labelID}", func(r chi.Router) {
							r.Use(app.LoadLabel)
							r.Patch("/", app.updateLabelHandler)
							r.Delete("/", app.deleteLabelHandler)
						})
					})
				})

				r.Route("/cycles", func(r chi.Router) {
					r.Get("/", app.listCyclesHandler)
					r.With(app.RequireCyclesEnabled).Post("/", app.createCycleHandler)

					r.Route("/{cycleID}", func(r chi.Router) {
						r.Use(app.LoadCycle)
						r.Get("/", app.getCycleHandler)

						r.Group(func(r chi.Router) {
							r.Use(app.RequireCyclesEnabled)
							r.Patch("/", app.updateCycleHandler)
							r.Delete("/", app.deleteCycleHandler)
							r.Post("/complete", app.completeCycleHandler)
						})
					})
				})

				r.Route("/issues", func(r chi.Router) {
					r.Get("/", app.listProjectIssuesHandler)
					r.Post("/", app.createIssueHandler)
				})

				r.Route("/comments", func(r chi.Router) {
					r.Get("/", app.getProjectCommentsHandler)
					r.Post("/", app.createProjectCommentHandler)

					r.Route("/{commentID}", func(r chi.Router) {
						r.Use(app.LoadProjectComment)
						r.With(app.RequireCommentAuthor).Patch("/", app.updateProjectCommentHandler)
						r.With(app.RequireCommentAuthorOrProjectAdmin).Delete("/", app.deleteProjectCommentHandler)
					})
				})
			})
		})
		r.Get("/docs/*", httpSwagger.Handler(
			httpSwagger.URL("/api/v1/docs/doc.json"),
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
