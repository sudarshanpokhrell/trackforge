package main

import (
	"errors"
	"net/http"
	"time"

	"github.com/sudarshanpokhrell/trackforge/internal/realtime"
	"github.com/sudarshanpokhrell/trackforge/internal/store"
	"github.com/sudarshanpokhrell/trackforge/internal/validator"
)

type CreateProjectPayload struct {
	Name        string     `json:"name"`
	Description string     `json:"description"`
	Emoji       string     `json:"emoji"`
	StartDate   *time.Time `json:"start_date"`
	TargetDate  *time.Time `json:"target_date"`
}

// @Summary Create a project
// @Description Admins and the superadmin only. The creator becomes the project's first admin.
// @Tags projects
// @Accept json
// @Produce json
// @Param payload body CreateProjectPayload true "Project details"
// @Success 201 {object} store.Project
// @Failure 400 {object} error
// @Failure 403 {object} error
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
		Emoji:       payload.Emoji,
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

	app.publish(r, realtime.Event{Type: realtime.TypeProjectUpdated, ProjectID: project.ID})
	// The creator is now the project's admin; their open streams were loaded without it.
	app.publish(r, realtime.Event{Type: realtime.TypeMembershipChanged, UserID: project.CreatedBy, ProjectID: project.ID})

	if err := app.writeJSON(w, http.StatusCreated, envelope{"project": project}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// @Summary List the projects the caller can see
// @Description The superadmin gets every project; everyone else gets the ones they belong to. Each project has my_role, the caller's role in it.
// @Tags projects
// @Produce json
// @Success 200 {array} store.Project
// @Failure 500 {object} error
// @Security BearerAuth
// @Router /projects [get]
func (app *application) listProjectsHandler(w http.ResponseWriter, r *http.Request) {
	projects, err := app.store.Projects.ListVisibleTo(r.Context(), app.contextUserID(r), app.contextUser(r).Role == store.UserRoleSuperadmin)

	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	if err := app.writeJSON(w, http.StatusOK, envelope{"projects": projects}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// @Summary Get a project with its members
// @Description Includes each member's role, and my_access, which tells the caller which actions to offer.
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

	project.MyAccess = app.contextProjectAccess(r)

	if err := app.writeJSON(w, http.StatusOK, envelope{"project": project}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// UpdateProjectPayload uses pointers so an omitted field is left untouched,
// which is what makes this a partial update.
type UpdateProjectPayload struct {
	Name        *string    `json:"name"`
	Description *string    `json:"description"`
	Emoji       *string    `json:"emoji"`
	StartDate   *time.Time `json:"start_date"`
	TargetDate  *time.Time `json:"target_date"`
}

// @Summary Update a project
// @Description Project admins and the superadmin only. Partial update; omitted fields keep their current value.
// @Tags projects
// @Accept json
// @Produce json
// @Param id path int true "Project ID"
// @Param payload body UpdateProjectPayload true "Fields to change"
// @Success 200 {object} store.Project
// @Failure 400 {object} error
// @Failure 403 {object} error
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
	if payload.Emoji != nil {
		project.Emoji = *payload.Emoji
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

	app.publish(r, realtime.Event{Type: realtime.TypeProjectUpdated, ProjectID: project.ID})

	if err := app.writeJSON(w, http.StatusOK, envelope{"project": project}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// @Summary Delete a project
// @Description Project admins and the superadmin only.
// @Tags projects
// @Produce json
// @Param id path int true "Project ID"
// @Success 200 {object} object
// @Failure 400 {object} error
// @Failure 403 {object} error
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

	app.publish(r, realtime.Event{Type: realtime.TypeProjectDeleted, ProjectID: projectID})

	if err := app.writeJSON(w, http.StatusOK, envelope{"message": "project deleted successfully"}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
