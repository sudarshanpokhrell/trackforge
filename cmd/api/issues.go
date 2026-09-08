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

// @Summary List a project's issues
// @Description Issues are returned newest first, each with its assignees.
// @Tags issues
// @Produce json
// @Param id path int true "Project ID"
// @Success 200 {array} store.Issue
// @Failure 400 {object} error
// @Failure 404 {object} error
// @Failure 500 {object} error
// @Security BearerAuth
// @Router /projects/{id}/issues [get]
func (app *application) listProjectIssuesHandler(w http.ResponseWriter, r *http.Request) {
	projectID, err := app.readIDParam(r)

	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	issues, err := app.store.Issues.ListByProject(r.Context(), projectID)

	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	if err := app.writeJSON(w, http.StatusOK, envelope{"issues": issues}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// @Summary Get one issue
// @Tags issues
// @Produce json
// @Param issueID path int true "Issue ID"
// @Success 200 {object} store.Issue
// @Failure 400 {object} error
// @Failure 404 {object} error
// @Failure 500 {object} error
// @Security BearerAuth
// @Router /issues/{issueID} [get]
func (app *application) getIssueHandler(w http.ResponseWriter, r *http.Request) {
	issue := app.contextIssue(r)

	if err := app.writeJSON(w, http.StatusOK, envelope{"issue": issue}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// UpdateIssuePayload is a patch: a field left out keeps its current value, and
// only the fields that actually change end up in the issue's activity trail.
type UpdateIssuePayload struct {
	Title       *string `json:"title"`
	Description *string `json:"description"`
	Status      *string `json:"status"`
	Priority    *string `json:"priority"`
}

// @Summary Edit an issue
// @Description Fields left out of the payload are unchanged. Every change is recorded on the issue's activity trail.
// @Tags issues
// @Accept json
// @Produce json
// @Param issueID path int true "Issue ID"
// @Param payload body UpdateIssuePayload true "Fields to change"
// @Success 200 {object} store.Issue
// @Failure 400 {object} error
// @Failure 403 {object} error
// @Failure 404 {object} error
// @Failure 409 {object} error
// @Failure 422 {object} error
// @Failure 500 {object} error
// @Security BearerAuth
// @Router /issues/{issueID} [patch]
func (app *application) updateIssueHandler(w http.ResponseWriter, r *http.Request) {
	issue := app.contextIssue(r)

	var payload UpdateIssuePayload

	if err := app.readJSON(w, r, &payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	// The store diffs against this snapshot to build the trail, so take it
	// before applying the patch.
	before := *issue

	v := validator.New()

	if payload.Title != nil {
		issue.Title = *payload.Title
	}

	if payload.Description != nil {
		issue.Description = payload.Description
	}

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

	if store.ValidateIssue(v, issue); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	if err := app.store.Issues.Update(r.Context(), issue, before, app.contextUserID(r)); err != nil {
		switch {
		case errors.Is(err, store.ErrEditConflict):
			app.editConflictResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	if err := app.writeJSON(w, http.StatusOK, envelope{"issue": issue}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// @Summary Delete an issue
// @Description Only the issue's author or a project admin may delete it. Its comments and activity trail go with it.
// @Tags issues
// @Produce json
// @Param issueID path int true "Issue ID"
// @Success 200 {object} object
// @Failure 400 {object} error
// @Failure 403 {object} error
// @Failure 404 {object} error
// @Failure 500 {object} error
// @Security BearerAuth
// @Router /issues/{issueID} [delete]
func (app *application) deleteIssueHandler(w http.ResponseWriter, r *http.Request) {
	issue := app.contextIssue(r)

	if err := app.store.Issues.Delete(r.Context(), issue.ID); err != nil {
		switch {
		case errors.Is(err, store.ErrNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	if err := app.writeJSON(w, http.StatusOK, envelope{"message": "issue deleted successfully"}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

type AddIssueAssigneePayload struct {
	UserID string `json:"user_id"`
}

// @Summary Assign a user to an issue
// @Description The user must already be a member of the project. An issue may have any number of assignees.
// @Tags issues
// @Accept json
// @Produce json
// @Param issueID path int true "Issue ID"
// @Param payload body AddIssueAssigneePayload true "User to assign"
// @Success 201 {object} store.Assignee
// @Failure 400 {object} error
// @Failure 404 {object} error
// @Failure 409 {object} error
// @Failure 422 {object} error
// @Failure 500 {object} error
// @Security BearerAuth
// @Router /issues/{issueID}/assignees [post]
func (app *application) addIssueAssigneeHandler(w http.ResponseWriter, r *http.Request) {
	issue := app.contextIssue(r)

	var payload AddIssueAssigneePayload

	if err := app.readJSON(w, r, &payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	v := validator.New()

	if v.Check(validator.UUIDRX.MatchString(payload.UserID), "user_id", "must be a valid user id"); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	// The foreign key only proves the user exists; assigning work to someone
	// with no access to the project is what we actually want to rule out.
	_, err := app.store.Memberships.GetRole(r.Context(), payload.UserID, issue.ProjectID)

	if err != nil {
		switch {
		case errors.Is(err, store.ErrNotFound):
			v.AddError("user_id", "must be a member of this project")
			app.failedValidationResponse(w, r, v.Errors)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

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

	err = app.store.Issues.AddAssignee(r.Context(), issue.ID, payload.UserID, app.contextUserID(r))

	if err != nil {
		switch {
		case errors.Is(err, store.ErrDuplicateAssignee):
			app.conflictResponse(w, r, err)
		case errors.Is(err, store.ErrNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	assignee := store.Assignee{ID: user.ID, Name: user.Name}

	if err := app.writeJSON(w, http.StatusCreated, envelope{"assignee": assignee}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// @Summary Unassign a user from an issue
// @Tags issues
// @Produce json
// @Param issueID path int true "Issue ID"
// @Param userID path string true "User ID"
// @Success 200 {object} object
// @Failure 400 {object} error
// @Failure 404 {object} error
// @Failure 500 {object} error
// @Security BearerAuth
// @Router /issues/{issueID}/assignees/{userID} [delete]
func (app *application) removeIssueAssigneeHandler(w http.ResponseWriter, r *http.Request) {
	issue := app.contextIssue(r)

	userID, err := app.readUserIDParam(r)

	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	err = app.store.Issues.RemoveAssignee(r.Context(), issue.ID, userID, app.contextUserID(r))

	if err != nil {
		switch {
		case errors.Is(err, store.ErrNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	if err := app.writeJSON(w, http.StatusOK, envelope{"message": "assignee removed successfully"}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
