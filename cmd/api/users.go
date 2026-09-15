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
// @Description Every user, oldest first. Filter with active=true|false; omit it for both
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
// @Description Create an admin or member. They must change the password on first login
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
// @Description Change name and/or role (admin or member). The superadmin's role can't be changed here
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
	user, ok := app.readTargetUser(w, r)

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
// @Description The user can no longer log in. Their history, memberships and assignments stay. You can't deactivate yourself
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
// @Router /users/{userID}/deactivate [post]
func (app *application) deactivateUserHandler(w http.ResponseWriter, r *http.Request) {
	user, ok := app.readTargetUser(w, r)

	if !ok {
		return
	}

	if user.ID == app.contextUserID(r) {
		app.failedValidationResponse(w, r, map[string]string{"user": "you cannot deactivate your own account"})
		return
	}

	user.IsActive = false
	app.saveUser(w, r, user)
}

// @Summary Reactivate a user
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
	user, ok := app.readTargetUser(w, r)

	if !ok {
		return
	}

	user.IsActive = true
	app.saveUser(w, r, user)
}

// @Summary Reset a user's password
// @Description Set a temporary password. The user must change it on their next login
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
	user, ok := app.readTargetUser(w, r)

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

// readTargetUser loads the user named by {userID}. On failure it has already
// written the response and returns false.
func (app *application) readTargetUser(w http.ResponseWriter, r *http.Request) (*store.User, bool) {
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

	return user, true
}

// saveUser persists user and writes it back as the response.
func (app *application) saveUser(w http.ResponseWriter, r *http.Request, user *store.User) {
	err := app.store.Users.Update(r.Context(), user)

	if err != nil {
		switch {
		case errors.Is(err, store.ErrNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	if err := app.writeJSON(w, http.StatusOK, envelope{"user": user}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
