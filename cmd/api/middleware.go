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
const projectAccessCtx contextKey = "project_access"
const commentCtx contextKey = "comment"
const issueCtx contextKey = "issue"
const issueCommentCtx contextKey = "issue_comment"

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

		if !user.IsActive {
			app.invalidAuthenticationResponse(w, r)
			return
		}

		ctx := context.WithValue(r.Context(), userCtx, user)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (app *application) RequireRole(min string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if !store.UserRoleAtLeast(app.contextUser(r).Role, min) {
				app.notPermittedResponse(w, r)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// RequireAuth authenticates the request like AuthTokenMiddleware and also rejects
// users who still have to change their password. Use AuthTokenMiddleware alone
// only for the routes such a user needs to reach, like changing that password.
func (app *application) RequireAuth(next http.Handler) http.Handler {
	return app.AuthTokenMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if app.contextUser(r).MustChangePassword {
			app.errorResponse(w, r, http.StatusForbidden, "password change required")
			return
		}

		next.ServeHTTP(w, r)
	}))
}

// projectAccess is what the caller may do with the project in the URL. It answers
// "can they see it", never "may they perform this action": that comes from the
// user's app-wide role through RequireRole.
func (app *application) projectAccess(r *http.Request, projectID int64) (store.ProjectAccess, error) {
	access := store.ProjectAccess{
		IsAdmin: store.UserRoleAtLeast(app.contextUser(r).Role, store.UserRoleAdmin),
	}

	member, err := app.store.Memberships.IsMember(r.Context(), app.contextUserID(r), projectID)

	if err != nil {
		return access, err
	}

	access.IsMember = member

	return access, nil
}

// RequireProjectAccess lets through admins (who reach every project) and members
// of this one. Everyone else gets a 404 rather than a 403, so the response never
// tells them a project they have no business seeing exists.
func (app *application) RequireProjectAccess(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		projectID, err := app.readIDParam(r)

		if err != nil {
			app.badRequestResponse(w, r, err)
			return
		}

		access, err := app.projectAccess(r, projectID)

		if err != nil {
			app.serverErrorResponse(w, r, err)
			return
		}

		if !access.IsMember {
			if !access.IsAdmin {
				app.notFoundResponse(w, r)
				return
			}

			// A membership row would have proved the project exists; an admin
			// passes without one, so check for it here.
			exists, err := app.store.Projects.Exists(r.Context(), projectID)

			if err != nil {
				app.serverErrorResponse(w, r, err)
				return
			}

			if !exists {
				app.notFoundResponse(w, r)
				return
			}
		}

		ctx := context.WithValue(r.Context(), projectAccessCtx, access)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// RequireIssueAccess loads the issue named by the URL and runs the project check
// against the project it belongs to, putting both the issue and the access in
// context. Issues are addressed by their own id, outside any project path, so
// this is the only thing standing between a member and another project's issues.
func (app *application) RequireIssueAccess(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		issueID, err := app.readIssueIDParam(r)

		if err != nil {
			app.badRequestResponse(w, r, err)
			return
		}

		issue, err := app.store.Issues.GetByID(r.Context(), issueID)

		if err != nil {
			switch {
			case errors.Is(err, store.ErrNotFound):
				app.notFoundResponse(w, r)
			default:
				app.serverErrorResponse(w, r, err)
			}
			return
		}

		access, err := app.projectAccess(r, issue.ProjectID)

		if err != nil {
			app.serverErrorResponse(w, r, err)
			return
		}

		// The issue was loaded, so its project exists; membership alone decides.
		if !access.IsAdmin && !access.IsMember {
			app.notFoundResponse(w, r)
			return
		}

		ctx := context.WithValue(r.Context(), projectAccessCtx, access)
		ctx = context.WithValue(ctx, issueCtx, issue)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// LoadProjectComment loads the comment named by the URL and puts it in context.
//
// It must run after RequireProjectAccess, which establishes the access this
// builds on. It adds the check that one cannot make: that the comment really
// belongs to the project in the path, so access to one project never reaches
// into another's comments.
func (app *application) LoadProjectComment(next http.Handler) http.Handler {
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

		ctx := context.WithValue(r.Context(), commentCtx, comment)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// RequireCommentAuthor admits only the author. Editing is not moderation: an
// admin deleting someone's comment is fine, an admin rewording it is not.
func (app *application) RequireCommentAuthor(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if app.contextComment(r).CreatedBy != app.contextUserID(r) {
			app.notPermittedResponse(w, r)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// RequireCommentAuthorOrAdmin admits the author or anyone who can moderate.
func (app *application) RequireCommentAuthorOrAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if app.contextComment(r).CreatedBy != app.contextUserID(r) && !app.contextIsAdmin(r) {
			app.notPermittedResponse(w, r)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// LoadIssueComment is LoadProjectComment for an issue's comments, and likewise
// runs after RequireIssueAccess.
func (app *application) LoadIssueComment(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		issue := app.contextIssue(r)

		commentID, err := app.readCommentIDParam(r)

		if err != nil {
			app.badRequestResponse(w, r, err)
			return
		}

		comment, err := app.store.IssueComments.GetByID(r.Context(), commentID)

		if err != nil {
			switch {
			case errors.Is(err, store.ErrNotFound):
				app.notFoundResponse(w, r)
			default:
				app.serverErrorResponse(w, r, err)
			}
			return
		}

		if comment.IssueID != issue.ID {
			app.notFoundResponse(w, r)
			return
		}

		ctx := context.WithValue(r.Context(), issueCommentCtx, comment)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (app *application) RequireIssueCommentAuthor(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if app.contextIssueComment(r).AuthorID != app.contextUserID(r) {
			app.notPermittedResponse(w, r)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func (app *application) RequireIssueCommentAuthorOrAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if app.contextIssueComment(r).AuthorID != app.contextUserID(r) && !app.contextIsAdmin(r) {
			app.notPermittedResponse(w, r)
			return
		}

		next.ServeHTTP(w, r)
	})
}
