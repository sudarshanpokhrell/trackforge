package main

import (
	"errors"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/sudarshanpokhrell/trackforge/internal/store"
	"github.com/sudarshanpokhrell/trackforge/internal/validator"
)

type LoginUserPayload struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// @Summary Login a user
// @Description Login a user with email and password
// @Tags auth
// @Accept json
// @Produce json
// @Param payload body LoginUserPayload true "User login credentials"
// @Success 200 {object} store.User
// @Failure 400 {object} error
// @Failure 401 {object} error
// @Failure 500 {object} error
// @Router /auth/login [post]
func (app *application) loginUserHandler(w http.ResponseWriter, r *http.Request) {
	var payload LoginUserPayload

	err := app.readJSON(w, r, &payload)

	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	v := validator.New()

	store.ValidateEmail(v, payload.Email)
	store.ValidatePasswordPlaintext(v, payload.Password)

	if !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	user, err := app.store.Users.GetByEmail(r.Context(), payload.Email)
	if err != nil {
		switch {
		case errors.Is(err, store.ErrNotFound):
			v.AddError("email", "invalid credentials.")
			app.failedValidationResponse(w, r, v.Errors)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	match, err := user.Password.Compare(payload.Password)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	if !match || !user.IsActive {
		v.AddError("email", "invalid email or password")
		app.failedValidationResponse(w, r, v.Errors)
		return
	}
	claims := jwt.MapClaims{
		"sub": user.ID,
		"exp": time.Now().Add(app.config.token.exp).Unix(),
		"iat": time.Now().Unix(),
		"nbf": time.Now().Unix(),
		"iss": app.config.token.iss,
		"aud": app.config.token.iss,
	}

	token, err := app.authenticator.GenerateToken(claims)

	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	cookie := http.Cookie{
		Name:     authCookieName,
		Value:    token,
		Path:     "/",
		MaxAge:   int(app.config.token.exp.Seconds()),
		Secure:   app.config.env != "development",
		HttpOnly: true,
		SameSite: http.SameSiteStrictMode,
	}

	http.SetCookie(w, &cookie)

	err = app.writeJSON(w, http.StatusOK, envelope{"user": user, "token": token}, nil)

	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// @Summary Get the current user
// @Description Return the user identified by the auth cookie or bearer token
// @Tags auth
// @Produce json
// @Success 200 {object} store.User
// @Failure 401 {object} error
// @Security BearerAuth
// @Router /auth/me [get]
func (app *application) getCurrentUserHandler(w http.ResponseWriter, r *http.Request) {
	err := app.writeJSON(w, http.StatusOK, envelope{"user": app.contextUser(r)}, nil)

	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// @Summary Logout
// @Description Clear the auth cookie
// @Tags auth
// @Success 204
// @Router /auth/logout [post]
func (app *application) logoutUserHandler(w http.ResponseWriter, r *http.Request) {
	cookie := http.Cookie{
		Name:     authCookieName,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		Secure:   app.config.env != "development",
		HttpOnly: true,
		SameSite: http.SameSiteStrictMode,
	}

	http.SetCookie(w, &cookie)
	w.WriteHeader(http.StatusNoContent)
}
