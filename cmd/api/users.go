package main

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/sudarshanpokhrell/trackforge/internal/store"
	"github.com/sudarshanpokhrell/trackforge/internal/validator"
)

type CreateUserPayload struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Role     string `json:"role"`
	Password string `json:"password"`
}

type UpdateUserPayload struct {
	Name *string `json:"name"`
	Role *string `json:"role"`
}

type ResetPasswordPayload struct {
	Password string `json:"password"`
}

// @Summary List users
// @Description Users, oldest first. Filter with active=true|false; omit it for both. Anyone logged in can list active users (project admins need it to add people); only admins and the superadmin see deactivated ones, so for everyone else the filter is always active=true
// @Tags users
// @Produce json
// @Param active query bool false "Only active (true) or only deactivated (false) users"
// @Success 200 {array} store.User
// @Failure 400 {object} error
// @Failure 403 {object} error
// @Failure 500 {object} error
// @Security BearerAuth
// @Router /users [get]
func (app *application) listUsersHandler(w http.ResponseWriter, r *http.Request) {
	var active *bool

	if raw := r.URL.Query().Get("active"); raw != "" {
		value, err := strconv.ParseBool(raw)

		if err != nil {
			app.badRequestResponse(w, r, errors.New("active must be true or false"))
			return
		}

		active = &value
	}

	if !store.UserRoleAtLeast(app.contextUser(r).Role, store.UserRoleAdmin) {
		if active != nil && !*active {
			app.notPermittedResponse(w, r)
			return
		}

		onlyActive := true
		active = &onlyActive
	}

	users, err := app.store.Users.List(r.Context(), active)

	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	if err := app.writeJSON(w, http.StatusOK, envelope{"users": users}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// @Summary Create a user
// @Description Create an admin or member. Admins may only create members (403 otherwise). The new user must change the password on first login
// @Tags users
// @Accept json
// @Produce json
// @Param payload body CreateUserPayload true "New user"
// @Success 201 {object} store.User
// @Failure 400 {object} error
// @Failure 403 {object} error
// @Failure 422 {object} error
// @Failure 500 {object} error
// @Security BearerAuth
// @Router /users [post]
func (app *application) createUserHandler(w http.ResponseWriter, r *http.Request) {
	var payload CreateUserPayload

	if err := app.readJSON(w, r, &payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	user := &store.User{
		Name:               payload.Name,
		Email:              payload.Email,
		Role:               payload.Role,
		MustChangePassword: true,
	}

	if err := user.Password.Set(payload.Password); err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	v := validator.New()

	store.ValidateUser(v, user)
	store.ValidateAssignableRole(v, user.Role)

	if !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	if user.Role != store.UserRoleMember && app.contextUser(r).Role != store.UserRoleSuperadmin {
		app.notPermittedResponse(w, r)
		return
	}

	err := app.store.Users.Create(r.Context(), user)

	if err != nil {
		switch {
		case errors.Is(err, store.ErrDuplicateEmail):
			v.AddError("email", "a user with this email address already exists.")
			app.failedValidationResponse(w, r, v.Errors)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	if err := app.writeJSON(w, http.StatusCreated, envelope{"user": user}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// @Summary Update a user
// @Description Change name and/or role (admin or member). Admins may only rename members; changing a role is superadmin-only. The superadmin's role can't be changed here
// @Tags users
// @Accept json
// @Produce json
// @Param userID path string true "User ID"
// @Param payload body UpdateUserPayload true "Fields to change"
// @Success 200 {object} store.User
// @Failure 400 {object} error
// @Failure 403 {object} error
// @Failure 404 {object} error
// @Failure 422 {object} error
// @Failure 500 {object} error
// @Security BearerAuth
// @Router /users/{userID} [patch]
func (app *application) updateUserHandler(w http.ResponseWriter, r *http.Request) {
	user, ok := app.readManagedUser(w, r)

	if !ok {
		return
	}

	var payload UpdateUserPayload

	if err := app.readJSON(w, r, &payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	v := validator.New()

	if payload.Name != nil {
		user.Name = *payload.Name
		store.ValidateUserName(v, user.Name)
	}

	if payload.Role != nil && *payload.Role != user.Role {
		if app.contextUser(r).Role != store.UserRoleSuperadmin {
			app.notPermittedResponse(w, r)
			return
		}

		store.ValidateAssignableRole(v, *payload.Role)
		v.Check(user.Role != store.UserRoleSuperadmin, "role", "the superadmin's role can only change by transferring ownership")
		user.Role = *payload.Role
	}

	if !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	app.saveUser(w, r, user)
}

// @Summary Deactivate a user
// @Description The user can no longer log in. Their history, memberships, project roles and assignments stay. You can't deactivate yourself, and admins may only deactivate members. orphaned_projects lists the projects where they were the only active project admin
// @Tags users
// @Produce json
// @Param userID path string true "User ID"
// @Success 200 {object} DeactivateUserResponse
// @Failure 400 {object} error
// @Failure 403 {object} error
// @Failure 404 {object} error
// @Failure 422 {object} error
// @Failure 500 {object} error
// @Security BearerAuth
// @Router /users/{userID}/deactivate [post]
func (app *application) deactivateUserHandler(w http.ResponseWriter, r *http.Request) {
	user, ok := app.readManagedUser(w, r)

	if !ok {
		return
	}

	if user.ID == app.contextUserID(r) {
		app.failedValidationResponse(w, r, map[string]string{"user": "you cannot deactivate your own account"})
		return
	}

	user.IsActive = false

	if !app.updateUser(w, r, user) {
		return
	}

	orphaned, err := app.store.Projects.ListSoleActiveAdminOf(r.Context(), user.ID)

	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	if err := app.writeJSON(w, http.StatusOK, envelope{"user": user, "orphaned_projects": orphaned}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// @Summary Reactivate a user
// @Description Admins may only reactivate members
// @Tags users
// @Produce json
// @Param userID path string true "User ID"
// @Success 200 {object} store.User
// @Failure 400 {object} error
// @Failure 403 {object} error
// @Failure 404 {object} error
// @Failure 500 {object} error
// @Security BearerAuth
// @Router /users/{userID}/reactivate [post]
func (app *application) reactivateUserHandler(w http.ResponseWriter, r *http.Request) {
	user, ok := app.readManagedUser(w, r)

	if !ok {
		return
	}

	user.IsActive = true
	app.saveUser(w, r, user)
}

// @Summary Reset a user's password
// @Description Set a temporary password. The user must change it on their next login. Admins may only reset members' passwords
// @Tags users
// @Accept json
// @Produce json
// @Param userID path string true "User ID"
// @Param payload body ResetPasswordPayload true "Temporary password"
// @Success 200 {object} store.User
// @Failure 400 {object} error
// @Failure 403 {object} error
// @Failure 404 {object} error
// @Failure 422 {object} error
// @Failure 500 {object} error
// @Security BearerAuth
// @Router /users/{userID}/reset-password [post]
func (app *application) resetUserPasswordHandler(w http.ResponseWriter, r *http.Request) {
	user, ok := app.readManagedUser(w, r)

	if !ok {
		return
	}

	var payload ResetPasswordPayload

	if err := app.readJSON(w, r, &payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	v := validator.New()

	if store.ValidatePasswordPlaintext(v, payload.Password); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	if err := user.Password.Set(payload.Password); err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	user.MustChangePassword = true
	app.saveUser(w, r, user)
}

// @Summary Transfer superadmin
// @Description Superadmin only. The target, who must be active, becomes the superadmin and the caller becomes an admin
// @Tags users
// @Produce json
// @Param userID path string true "User ID"
// @Success 200 {object} store.User
// @Failure 400 {object} error
// @Failure 403 {object} error
// @Failure 404 {object} error
// @Failure 422 {object} error
// @Failure 500 {object} error
// @Security BearerAuth
// @Router /users/{userID}/make-superadmin [post]
func (app *application) makeSuperadminHandler(w http.ResponseWriter, r *http.Request) {
	user, ok := app.readManagedUser(w, r)

	if !ok {
		return
	}

	v := validator.New()

	v.Check(user.ID != app.contextUserID(r), "user", "you are already the superadmin")
	v.Check(user.IsActive, "user", "must be an active user")

	if !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	err := app.store.Users.TransferSuperadmin(r.Context(), app.contextUserID(r), user.ID)

	if err != nil {
		switch {
		case errors.Is(err, store.ErrNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	user.Role = store.UserRoleSuperadmin

	if err := app.writeJSON(w, http.StatusOK, envelope{"user": user}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

type DeactivateUserResponse struct {
	User             store.User         `json:"user"`
	OrphanedProjects []store.ProjectRef `json:"orphaned_projects"`
}

// readManagedUser loads the user named by {userID} and checks the caller may
// manage them: the superadmin manages anyone, an admin manages members only.
// Rules about acting on yourself stay with each handler. On failure it has
// already written the response and returns false.
func (app *application) readManagedUser(w http.ResponseWriter, r *http.Request) (*store.User, bool) {
	userID, err := app.readUserIDParam(r)

	if err != nil {
		app.badRequestResponse(w, r, err)
		return nil, false
	}

	user, err := app.store.Users.GetById(r.Context(), userID)

	if err != nil {
		switch {
		case errors.Is(err, store.ErrNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return nil, false
	}

	if !canManageUser(app.contextUser(r), user) {
		app.notPermittedResponse(w, r)
		return nil, false
	}

	return user, true
}

func canManageUser(actor, target *store.User) bool {
	switch actor.Role {
	case store.UserRoleSuperadmin:
		return true
	case store.UserRoleAdmin:
		return target.Role == store.UserRoleMember
	default:
		return false
	}
}

// saveUser persists user and writes it back as the response.
func (app *application) saveUser(w http.ResponseWriter, r *http.Request, user *store.User) {
	if !app.updateUser(w, r, user) {
		return
	}

	if err := app.writeJSON(w, http.StatusOK, envelope{"user": user}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// updateUser persists user. On failure it has already written the response and
// returns false.
func (app *application) updateUser(w http.ResponseWriter, r *http.Request, user *store.User) bool {
	err := app.store.Users.Update(r.Context(), user)

	if err != nil {
		switch {
		case errors.Is(err, store.ErrNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return false
	}

	return true
}
