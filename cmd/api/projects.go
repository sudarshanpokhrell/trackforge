package main

import (
	"errors"
	"net/http"
	"time"

	"github.com/sudarshanpokhrell/trackforge/internal/store"
	"github.com/sudarshanpokhrell/trackforge/internal/validator"
)

type CreateProjectPayload struct {
	Name        string     `json:"name"`
	Description string     `json:"description"`
	StartDate   *time.Time `json:"start_date"`
	TargetDate  *time.Time `json:"target_date"`
}

// @Summary Create a project
// @Tags projects
// @Accept json
// @Produce json
// @Param payload body CreateProjectPayload true "Project details"
// @Success 201 {object} store.Project
// @Failure 400 {object} error
// @Failure 422 {object} error
// @Failure 500 {object} error
// @Security BearerAuth
// @Router /projects [post]
func (app *application) createProjectHandler(w http.ResponseWriter, r *http.Request) {
	var payload CreateProjectPayload

	if err := app.readJSON(w, r, &payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	project := store.Project{
		Name:        payload.Name,
		Description: payload.Description,
		StartDate:   payload.StartDate,
		TargetDate:  payload.TargetDate,
		CreatedBy:   app.contextUserID(r),
	}

	v := validator.New()

	if store.ValidateProject(v, &project); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	err := app.store.Projects.Create(r.Context(), &project)

	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	if err := app.writeJSON(w, http.StatusCreated, envelope{"project": project}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// @Summary List the caller's projects
// @Tags projects
// @Produce json
// @Success 200 {array} store.Project
// @Failure 500 {object} error
// @Security BearerAuth
// @Router /projects [get]
func (app *application) getUserProjectsHandler(w http.ResponseWriter, r *http.Request) {
	userId := app.contextUserID(r)
	projects, err := app.store.Projects.GetProjectsByUserID(r.Context(), userId)

	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	if err := app.writeJSON(w, http.StatusOK, envelope{"projects": projects}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// @Summary Get a project with its members
// @Tags projects
// @Produce json
// @Param id path int true "Project ID"
// @Success 200 {object} store.ProjectDetails
// @Failure 400 {object} error
// @Failure 404 {object} error
// @Failure 500 {object} error
// @Security BearerAuth
// @Router /projects/{id} [get]
func (app *application) getProjectByIDHandler(w http.ResponseWriter, r *http.Request) {
	projectID, err := app.readIDParam(r)

	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	project, err := app.store.Projects.GetProjectDetails(r.Context(), projectID)

	if err != nil {
		switch {
		case errors.Is(err, store.ErrNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	if err := app.writeJSON(w, http.StatusOK, envelope{"project": project}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// UpdateProjectPayload uses pointers so an omitted field is left untouched,
// which is what makes this a partial update.
type UpdateProjectPayload struct {
	Name        *string    `json:"name"`
	Description *string    `json:"description"`
	StartDate   *time.Time `json:"start_date"`
	TargetDate  *time.Time `json:"target_date"`
}

// @Summary Update a project
// @Description Partial update; omitted fields keep their current value.
// @Tags projects
// @Accept json
// @Produce json
// @Param id path int true "Project ID"
// @Param payload body UpdateProjectPayload true "Fields to change"
// @Success 200 {object} store.Project
// @Failure 400 {object} error
// @Failure 404 {object} error
// @Failure 409 {object} error
// @Failure 422 {object} error
// @Failure 500 {object} error
// @Security BearerAuth
// @Router /projects/{id} [put]
func (app *application) updateProjectHandler(w http.ResponseWriter, r *http.Request) {
	projectID, err := app.readIDParam(r)

	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	var payload UpdateProjectPayload

	if err := app.readJSON(w, r, &payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	project, err := app.store.Projects.GetByID(r.Context(), projectID)

	if err != nil {
		switch {
		case errors.Is(err, store.ErrNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	if payload.Name != nil {
		project.Name = *payload.Name
	}
	if payload.Description != nil {
		project.Description = *payload.Description
	}
	if payload.StartDate != nil {
		project.StartDate = payload.StartDate
	}
	if payload.TargetDate != nil {
		project.TargetDate = payload.TargetDate
	}

	v := validator.New()

	if store.ValidateProject(v, project); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	if err := app.store.Projects.Update(r.Context(), project); err != nil {
		switch {
		case errors.Is(err, store.ErrEditConflict):
			app.editConflictResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	if err := app.writeJSON(w, http.StatusOK, envelope{"project": project}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// UpdateProjectLeadPayload carries the user to put in charge of the project.
type UpdateProjectLeadPayload struct {
	LeadID string `json:"lead_id"`
}

// @Summary Set a project's lead
// @Description Puts a user in charge of the project. They must already be a member of it. Use DELETE to unassign.
// @Tags projects
// @Accept json
// @Produce json
// @Param id path int true "Project ID"
// @Param payload body UpdateProjectLeadPayload true "The new lead"
// @Success 200 {object} store.Project
// @Failure 400 {object} error
// @Failure 404 {object} error
// @Failure 422 {object} error
// @Failure 500 {object} error
// @Security BearerAuth
// @Router /projects/{id}/lead [put]
func (app *application) updateProjectLeadHandler(w http.ResponseWriter, r *http.Request) {
	projectID, err := app.readIDParam(r)

	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	var payload UpdateProjectLeadPayload

	if err := app.readJSON(w, r, &payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	v := validator.New()

	v.Check(payload.LeadID != "", "lead_id", "must be provided")
	v.Check(validator.UUIDRX.MatchString(payload.LeadID), "lead_id", "must be a valid user id")

	if !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	// Only a member of the project can lead it.
	if _, err := app.store.Memberships.GetRole(r.Context(), payload.LeadID, projectID); err != nil {
		switch {
		case errors.Is(err, store.ErrNotFound):
			v.AddError("lead_id", "must be a member of the project")
			app.failedValidationResponse(w, r, v.Errors)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	project, err := app.store.Projects.UpdateLead(r.Context(), projectID, &payload.LeadID)

	if err != nil {
		switch {
		case errors.Is(err, store.ErrNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	if err := app.writeJSON(w, http.StatusOK, envelope{"project": project}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// @Summary Delete a project
// @Tags projects
// @Produce json
// @Param id path int true "Project ID"
// @Success 200 {object} object
// @Failure 400 {object} error
// @Failure 404 {object} error
// @Failure 500 {object} error
// @Security BearerAuth
// @Router /projects/{id} [delete]
func (app *application) deleteProjectHandler(w http.ResponseWriter, r *http.Request) {
	projectID, err := app.readIDParam(r)

	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	err = app.store.Projects.Delete(r.Context(), projectID)

	if err != nil {
		switch {
		case errors.Is(err, store.ErrNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	if err := app.writeJSON(w, http.StatusOK, envelope{"message": "project deleted successfully"}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
