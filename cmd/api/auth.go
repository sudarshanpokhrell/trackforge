package main

import (
	"net/http"

	"github.com/sudarshanpokhrell/trackforge/internal/store"
)

func (app *application) registerUserHandler(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Name     string `json:"name"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	err := app.readJSON(w, r, &payload)

	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	user := &store.User{
		Name:  payload.Name,
		Email: payload.Email,
	}

	err = user.Password.Set(payload.Password)

	if err != nil {
		app.serverErrorResponse(w, r, err)
	}

	// v := validator.New()

}
