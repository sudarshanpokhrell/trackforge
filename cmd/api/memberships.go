package main

import (
	"errors"
	"net/http"

	"github.com/sudarshanpokhrell/trackforge/internal/store"
	"github.com/sudarshanpokhrell/trackforge/internal/validator"
)

type AddProjectMemberPayload struct {
	UserID string `json:"user_id"`
}

// @Summary Add a member to a project
// @Description Admins and the superadmin only. Membership is yes/no: what a member may do comes from their app-wide role.
// @Tags memberships
// @Accept json
// @Produce json
// @Param id path int true "Project ID"
// @Param payload body AddProjectMemberPayload true "Member to add"
// @Success 201 {object} store.Membership
// @Failure 400 {object} error
// @Failure 403 {object} error
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

	v := validator.New()

	if v.Check(validator.UUIDRX.MatchString(payload.UserID), "user_id", "must be a valid user id"); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	// The foreign key only proves the user exists. Adding someone who has been
	// deactivated would hand them work they cannot log in to do.
	user, err := app.store.Users.GetById(r.Context(), payload.UserID)

	if err != nil {
		switch {
		case errors.Is(err, store.ErrNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	if !user.IsActive {
		v.AddError("user_id", "must be an active user")
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	err = app.store.Memberships.Create(r.Context(), payload.UserID, projectID)

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
	}

	if err := app.writeJSON(w, http.StatusCreated, envelope{"membership": membership}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// @Summary Remove a member from a project
// @Description Admins and the superadmin only. The member is unassigned from every issue in the project.
// @Tags memberships
// @Produce json
// @Param id path int true "Project ID"
// @Param userID path string true "User ID"
// @Success 200 {object} object
// @Failure 400 {object} error
// @Failure 403 {object} error
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
