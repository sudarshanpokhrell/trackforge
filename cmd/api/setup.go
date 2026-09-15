package main

import (
	"errors"
	"net/http"

	"github.com/sudarshanpokhrell/trackforge/internal/store"
	"github.com/sudarshanpokhrell/trackforge/internal/validator"
)

type SetupStatusResponse struct {
	SetupRequired bool   `json:"setup_required"`
	AppName       string `json:"app_name"`
}

type SetupPayload struct {
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// @Summary Get first-run setup status
// @Description Report whether the install still needs its superadmin created
// @Tags setup
// @Produce json
// @Success 200 {object} SetupStatusResponse
// @Failure 500 {object} error
// @Router /setup [get]
func (app *application) getSetupStatusHandler(w http.ResponseWriter, r *http.Request) {
	exists, err := app.store.Users.SuperadminExists(r.Context())

	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{
		"setup_required": !exists,
		"app_name":       app.config.app.name,
	}, nil)

	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// @Summary Complete first-run setup
// @Description Create the superadmin account. Only works once: after that it returns 409
// @Tags setup
// @Accept json
// @Produce json
// @Param payload body SetupPayload true "Superadmin account details"
// @Success 201 {object} store.User
// @Failure 400 {object} error
// @Failure 409 {object} error
// @Failure 422 {object} error
// @Failure 500 {object} error
// @Router /setup [post]
func (app *application) setupHandler(w http.ResponseWriter, r *http.Request) {
	var payload SetupPayload

	err := app.readJSON(w, r, &payload)

	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	exists, err := app.store.Users.SuperadminExists(r.Context())

	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	if exists {
		app.conflictResponse(w, r, store.ErrSetupDone)
		return
	}

	user := &store.User{
		Name:  payload.Name,
		Email: payload.Email,
	}

	err = user.Password.Set(payload.Password)

	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	v := validator.New()

	if store.ValidateUser(v, user); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	user.Role = store.UserRoleSuperadmin
	user.MustChangePassword = false
	err = app.store.Users.Create(r.Context(), user)

	if err != nil {
		switch {
		case errors.Is(err, store.ErrSetupDone):
			app.conflictResponse(w, r, err)
		case errors.Is(err, store.ErrDuplicateEmail):
			v.AddError("email", "a user with this email address already exists.")
			app.failedValidationResponse(w, r, v.Errors)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	err = app.writeJSON(w, http.StatusCreated, envelope{"user": user}, nil)

	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
