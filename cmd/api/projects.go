package main

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/sudarshanpokhrell/trackforge/internal/store"
	"github.com/sudarshanpokhrell/trackforge/internal/validator"
)

type CreateProjectPayload struct {
	Name        string    `json:"name"`
	Description string    `json:"description"`
	StartDate   time.Time `json:"start_date"`
	TargetDate  time.Time `json:"target_date"`
}

func (app *application) createProjectHandler(w http.ResponseWriter, r *http.Request) {
	//TODO: implement the get user context here
	userId := "random-string"

	var payload CreateProjectPayload

	if err := app.readJSON(w, r, &payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	v := validator.New()

	v.Check(payload.Name != "", "name", "must not be empty")

	if !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	project := store.Project{
		Name:        payload.Name,
		Description: payload.Description,
		StartDate:   payload.StartDate,
		TargetDate:  payload.TargetDate,
	}
	project.CreatedBy.ID = userId

	err := app.store.Projects.Create(r.Context(), &project)

	if err != nil {
		app.serverErrorResponse(w, r, err)
	}

	app.writeJSON(w, http.StatusCreated, envelope{
		"project": project,
	}, nil)
}

func (app *application) getUserProjectsHandler(w http.ResponseWriter, r *http.Request) {
	//TODO: get user from userContext

	userId := "random-string"

	projects, err := app.store.Projects.GetProjectsByUserID(r.Context(), userId)

	if err != nil {
		app.serverErrorResponse(w, r, err)
	}

	app.writeJSON(w, http.StatusOK, envelope{
		"projects": projects,
	}, nil)
}

func (app *application) getProjectByIDHandler(w http.ResponseWriter, r *http.Request) {

	idStr := chi.URLParam(r, "id")

	projectId, err := strconv.ParseInt(idStr, 10, 64)

	if err != nil || projectId < 1 {
		app.badRequestResponse(w, r, errors.New("Invalid project ID"))
		return
	}

	project, err := app.store.Projects.GetProjectDetails(r.Context(), projectId)

	if err != nil {
		switch {
		case errors.Is(err, store.ErrNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	app.writeJSON(w, http.StatusOK, envelope{
		"project": project,
	}, nil)
}

type UpdateProjectPayload struct {
	Name        *string    `json:"name"`
	Description *string    `json:"description"`
	StartDate   *time.Time `json:"start_date"`
	TargetDate  *time.Time `json:"target_date"`
}

func (app *application) updateProjectHandler(w http.ResponseWriter, r *http.Request) {

	idStr := chi.URLParam(r, "id")

	projectId, err := strconv.ParseInt(idStr, 10, 64)

	if err != nil || projectId < 1 {
		app.badRequestResponse(w, r, errors.New("Invalid project ID"))
		return
	}

	var payload UpdateProjectPayload

	project, err := app.store.Projects.GetByID(r.Context(), projectId)

	if err != nil {
		switch {
		case errors.Is(err, store.ErrNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	if err := app.readJSON(w, r, &payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if payload.Name != nil {
		project.Name = *payload.Name
	}
	if payload.Description != nil {
		project.Description = *payload.Description
	}
	if payload.StartDate != nil {
		project.StartDate = *payload.StartDate
	}
	if payload.TargetDate != nil {
		project.TargetDate = *payload.TargetDate
	}

	if err := app.store.Projects.Update(r.Context(), projectId, project); err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	app.writeJSON(w, http.StatusOK, envelope{
		"project": project,
	}, nil)

}

func (app *application) deleteProjectHandler(w http.ResponseWriter, r *http.Request) {

	idStr := chi.URLParam(r, "id")

	projectId, err := strconv.ParseInt(idStr, 10, 64)

	if err != nil || projectId < 1 {
		app.badRequestResponse(w, r, errors.New("invalid project id"))
		return
	}

	err = app.store.Projects.Delete(r.Context(), projectId)

	if err != nil {
		switch {
		case errors.Is(err, store.ErrNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	app.writeJSON(w, http.StatusOK, envelope{
		"message": "Project deleted successfully",
	}, nil)
}
