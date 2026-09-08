package main

import (
	"errors"
	"net/http"
	"strings"

	"github.com/sudarshanpokhrell/trackforge/internal/store"
	"github.com/sudarshanpokhrell/trackforge/internal/validator"
)

type CreateIssuePayload struct {
	Title       string  `json:"title"`
	Description *string `json:"description"`
	Status      *string `json:"status"`
	Priority    *string `json:"priority"`
}

// @Summary Create an issue on a project
// @Description Omitting status or priority falls back to 'backlog' and 'no-priority'.
// @Tags issues
// @Accept json
// @Produce json
// @Param id path int true "Project ID"
// @Param payload body CreateIssuePayload true "Issue to create"
// @Success 201 {object} store.Issue
// @Failure 400 {object} error
// @Failure 404 {object} error
// @Failure 422 {object} error
// @Failure 500 {object} error
// @Security BearerAuth
// @Router /projects/{id}/issues [post]
func (app *application) createIssueHandler(w http.ResponseWriter, r *http.Request) {
	projectID, err := app.readIDParam(r)

	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	var payload CreateIssuePayload

	if err := app.readJSON(w, r, &payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	user := app.contextUser(r)

	issue := store.Issue{
		ProjectID:   projectID,
		AuthorID:    user.ID,
		Title:       payload.Title,
		Description: payload.Description,
	}

	v := validator.New()

	if payload.Status != nil {
		if strings.TrimSpace(*payload.Status) == "" {
			v.AddError("status", "must not be empty")
		} else {
			issue.Status = *payload.Status
		}
	}

	if payload.Priority != nil {
		if strings.TrimSpace(*payload.Priority) == "" {
			v.AddError("priority", "must not be empty")
		} else {
			issue.Priority = *payload.Priority
		}
	}

	if store.ValidateIssue(v, &issue); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	if err := app.store.Issues.Create(r.Context(), &issue); err != nil {
		switch {
		case errors.Is(err, store.ErrNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	issue.Assignees = []store.Assignee{}

	if err := app.writeJSON(w, http.StatusCreated, envelope{"issue": issue}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
