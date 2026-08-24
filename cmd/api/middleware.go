package main

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"github.com/sudarshanpokhrell/trackforge/internal/store"
	"github.com/sudarshanpokhrell/trackforge/internal/validator"
)

type contextKey string

const userCtx contextKey = "user"
const projectRoleCtx contextKey = "project_role"
const commentCtx contextKey = "comment"

const authCookieName = "jwt_token"

var errNoToken = errors.New("no authentication token in request")

func tokenFromRequest(r *http.Request) (string, error) {
	if header := r.Header.Get("Authorization"); header != "" {
		scheme, token, found := strings.Cut(header, " ")

		if !found || !strings.EqualFold(scheme, "Bearer") || token == "" {
			return "", errors.New("authorization header must be in the form: Bearer <token>")
		}

		return token, nil
	}

	cookie, err := r.Cookie(authCookieName)

	if err != nil {
		return "", errNoToken
	}

	return cookie.Value, nil
}

func (app *application) AuthTokenMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token, err := tokenFromRequest(r)

		if err != nil {
			if errors.Is(err, errNoToken) {
				app.authenticationRequiredResponse(w, r)
			} else {
				app.invalidAuthenticationResponse(w, r)
			}
			return
		}

		jwtToken, err := app.authenticator.ValidateToken(token)

		if err != nil {
			app.invalidAuthenticationResponse(w, r)
			return
		}

		claims, ok := jwtToken.Claims.(jwt.MapClaims)

		if !ok {
			app.invalidAuthenticationResponse(w, r)
			return
		}

		userID, ok := claims["sub"].(string)

		if !ok || !validator.UUIDRX.MatchString(userID) {
			app.invalidAuthenticationResponse(w, r)
			return
		}

		user, err := app.store.Users.GetById(r.Context(), userID)
		if err != nil {
			switch {
			case errors.Is(err, store.ErrNotFound):
				app.invalidAuthenticationResponse(w, r)
			default:
				app.serverErrorResponse(w, r, err)
			}
			return
		}

		ctx := context.WithValue(r.Context(), userCtx, user)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (app *application) RequireProjectRole(minRole string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			projectID, err := app.readIDParam(r)

			if err != nil {
				app.badRequestResponse(w, r, err)
				return
			}

			role, err := app.store.Memberships.GetRole(r.Context(), app.contextUserID(r), projectID)

			if err != nil {
				switch {
				case errors.Is(err, store.ErrNotFound):
					app.notFoundResponse(w, r)
				default:
					app.serverErrorResponse(w, r, err)
				}
				return
			}

			if !store.RoleAtLeast(role, minRole) {
				app.notPermittedResponse(w, r)
				return
			}

			ctx := context.WithValue(r.Context(), projectRoleCtx, role)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// RequireCommentOwnership loads the comment named by the URL and lets the request
// through only for its author or a project admin; the comment is put in the
// request context for the handler to read with contextComment.
//
// It must run after RequireProjectRole, which establishes the membership this
// builds on and the role in the context. This adds the two checks that one
// cannot make: that the comment really belongs to the project in the path
// (otherwise membership in one project would reach into another's comments),
// and that the caller authored it or administers the project.
func (app *application) RequireCommentOwnership(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		projectID, err := app.readIDParam(r)

		if err != nil {
			app.badRequestResponse(w, r, err)
			return
		}

		commentID, err := app.readCommentIDParam(r)

		if err != nil {
			app.badRequestResponse(w, r, err)
			return
		}

		comment, err := app.store.Comments.GetProjectCommentByID(r.Context(), commentID)

		if err != nil {
			switch {
			case errors.Is(err, store.ErrNotFound):
				app.notFoundResponse(w, r)
			default:
				app.serverErrorResponse(w, r, err)
			}
			return
		}

		// Not a 403: that would confirm the comment exists to someone with no
		// business knowing it does.
		if comment.ProjectID != projectID {
			app.notFoundResponse(w, r)
			return
		}

		role, _ := app.contextProjectRole(r)

		if comment.CreatedBy != app.contextUserID(r) && !store.RoleAtLeast(role, store.RoleAdmin) {
			app.notPermittedResponse(w, r)
			return
		}

		ctx := context.WithValue(r.Context(), commentCtx, comment)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
