package main

import (
	"errors"
	"net/http"

	"github.com/sudarshanpokhrell/trackforge/internal/store"
	"github.com/sudarshanpokhrell/trackforge/internal/validator"
)

type AddProjectMemberPayload struct {
	UserID string `json:"user_id"`
	Role   string `json:"role"`
}

// @Summary Add a member to a project
// @Description Role defaults to "editor" when omitted.
// @Tags memberships
// @Accept json
// @Produce json
// @Param id path int true "Project ID"
// @Param payload body AddProjectMemberPayload true "Member to add"
// @Success 201 {object} store.Membership
// @Failure 400 {object} error
// @Failure 404 {object} error
// @Failure 409 {object} error
// @Failure 422 {object} error
// @Failure 500 {object} error
// @Security BearerAuth
// @Router /projects/{id}/members [post]
func (app *application) addProjectMemberHandler(w http.ResponseWriter, r *http.Request) {
	projectID, err := app.readIDParam(r)

	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	var payload AddProjectMemberPayload

	if err := app.readJSON(w, r, &payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if payload.Role == "" {
		payload.Role = store.RoleEditor
	}

	v := validator.New()

	v.Check(validator.UUIDRX.MatchString(payload.UserID), "user_id", "must be a valid user id")
	store.ValidateRole(v, payload.Role)

	if !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	err = app.store.Memberships.Create(r.Context(), payload.UserID, payload.Role, projectID)

	if err != nil {
		switch {
		case errors.Is(err, store.ErrDuplicateMembership):
			app.conflictResponse(w, r, err)
		case errors.Is(err, store.ErrNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	membership := store.Membership{
		ProjectID: projectID,
		UserID:    payload.UserID,
		Role:      payload.Role,
	}

	if err := app.writeJSON(w, http.StatusCreated, envelope{"membership": membership}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

type UpdateProjectMemberRolePayload struct {
	Role string `json:"role"`
}

// @Summary Change a member's role
// @Tags memberships
// @Accept json
// @Produce json
// @Param id path int true "Project ID"
// @Param userID path string true "User ID"
// @Param payload body UpdateProjectMemberRolePayload true "New role"
// @Success 200 {object} store.Membership
// @Failure 400 {object} error
// @Failure 404 {object} error
// @Failure 422 {object} error
// @Failure 500 {object} error
// @Security BearerAuth
// @Router /projects/{id}/members/{userID} [patch]
func (app *application) updateProjectMemberRoleHandler(w http.ResponseWriter, r *http.Request) {
	projectID, err := app.readIDParam(r)

	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	userID, err := app.readUserIDParam(r)

	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	var payload UpdateProjectMemberRolePayload

	if err := app.readJSON(w, r, &payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	v := validator.New()

	if store.ValidateRole(v, payload.Role); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	err = app.store.Memberships.UpdateRole(r.Context(), userID, payload.Role, projectID)

	if err != nil {
		switch {
		case errors.Is(err, store.ErrNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	membership := store.Membership{
		ProjectID: projectID,
		UserID:    userID,
		Role:      payload.Role,
	}

	if err := app.writeJSON(w, http.StatusOK, envelope{"membership": membership}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// @Summary Remove a member from a project
// @Tags memberships
// @Produce json
// @Param id path int true "Project ID"
// @Param userID path string true "User ID"
// @Success 200 {object} object
// @Failure 400 {object} error
// @Failure 404 {object} error
// @Failure 500 {object} error
// @Security BearerAuth
// @Router /projects/{id}/members/{userID} [delete]
func (app *application) removeProjectMemberHandler(w http.ResponseWriter, r *http.Request) {
	projectID, err := app.readIDParam(r)

	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	userID, err := app.readUserIDParam(r)

	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	err = app.store.Memberships.Delete(r.Context(), userID, projectID)

	if err != nil {
		switch {
		case errors.Is(err, store.ErrNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	if err := app.writeJSON(w, http.StatusOK, envelope{"message": "member removed successfully"}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
