package main

import (
	"errors"
	"net/http"
	"strings"

	"github.com/sudarshanpokhrell/trackforge/internal/realtime"
	"github.com/sudarshanpokhrell/trackforge/internal/store"
	"github.com/sudarshanpokhrell/trackforge/internal/validator"
)

type CreateLabelPayload struct {
	Name  string `json:"name"`
	Color string `json:"color"`
}

// UpdateLabelPayload is a patch: a field left out keeps its current value.
type UpdateLabelPayload struct {
	Name  *string `json:"name"`
	Color *string `json:"color"`
}

type AddIssueLabelPayload struct {
	LabelID int64 `json:"label_id"`
}

// @Summary List a project's labels
// @Description Sorted by name. Anyone in the project may read them.
// @Tags labels
// @Produce json
// @Param id path int true "Project ID"
// @Success 200 {array} store.Label
// @Failure 400 {object} error
// @Failure 404 {object} error
// @Failure 500 {object} error
// @Security BearerAuth
// @Router /projects/{id}/labels [get]
func (app *application) listLabelsHandler(w http.ResponseWriter, r *http.Request) {
	projectID, err := app.readIDParam(r)

	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	labels, err := app.store.Labels.ListByProject(r.Context(), projectID)

	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	if err := app.writeJSON(w, http.StatusOK, envelope{"labels": labels}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// @Summary Create a label on a project
// @Description Project admins and the superadmin only. Names are unique within the project, ignoring case. Color is a hex value like #e11d48.
// @Tags labels
// @Accept json
// @Produce json
// @Param id path int true "Project ID"
// @Param payload body CreateLabelPayload true "Label to create"
// @Success 201 {object} store.Label
// @Failure 400 {object} error
// @Failure 403 {object} error
// @Failure 404 {object} error
// @Failure 409 {object} error
// @Failure 422 {object} error
// @Failure 500 {object} error
// @Security BearerAuth
// @Router /projects/{id}/labels [post]
func (app *application) createLabelHandler(w http.ResponseWriter, r *http.Request) {
	projectID, err := app.readIDParam(r)

	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	var payload CreateLabelPayload

	if err := app.readJSON(w, r, &payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	userID := app.contextUserID(r)

	label := store.Label{
		ProjectID: projectID,
		Name:      strings.TrimSpace(payload.Name),
		Color:     payload.Color,
		CreatedBy: &userID,
	}

	v := validator.New()

	if store.ValidateLabel(v, &label); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	if err := app.store.Labels.Create(r.Context(), &label); err != nil {
		app.labelWriteErrorResponse(w, r, err)
		return
	}

	app.publish(r, realtime.Event{Type: realtime.TypeProjectLabelsChanged, ProjectID: label.ProjectID})

	if err := app.writeJSON(w, http.StatusCreated, envelope{"label": label}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// @Summary Edit a label
// @Description Project admins and the superadmin only. Fields left out are unchanged. Issues' past activity keeps the name and color the label had then.
// @Tags labels
// @Accept json
// @Produce json
// @Param id path int true "Project ID"
// @Param labelID path int true "Label ID"
// @Param payload body UpdateLabelPayload true "Fields to change"
// @Success 200 {object} store.Label
// @Failure 400 {object} error
// @Failure 403 {object} error
// @Failure 404 {object} error
// @Failure 409 {object} error
// @Failure 422 {object} error
// @Failure 500 {object} error
// @Security BearerAuth
// @Router /projects/{id}/labels/{labelID} [patch]
func (app *application) updateLabelHandler(w http.ResponseWriter, r *http.Request) {
	label := app.contextLabel(r)

	var payload UpdateLabelPayload

	if err := app.readJSON(w, r, &payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if payload.Name != nil {
		label.Name = strings.TrimSpace(*payload.Name)
	}

	if payload.Color != nil {
		label.Color = *payload.Color
	}

	v := validator.New()

	if store.ValidateLabel(v, label); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	if err := app.store.Labels.Update(r.Context(), label); err != nil {
		app.labelWriteErrorResponse(w, r, err)
		return
	}

	app.publish(r, realtime.Event{Type: realtime.TypeProjectLabelsChanged, ProjectID: label.ProjectID})

	if err := app.writeJSON(w, http.StatusOK, envelope{"label": label}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// @Summary Delete a label
// @Description Project admins and the superadmin only. The label comes off every issue; their activity keeps a snapshot of it. The response says how many issues had it.
// @Tags labels
// @Produce json
// @Param id path int true "Project ID"
// @Param labelID path int true "Label ID"
// @Success 200 {object} object
// @Failure 400 {object} error
// @Failure 403 {object} error
// @Failure 404 {object} error
// @Failure 500 {object} error
// @Security BearerAuth
// @Router /projects/{id}/labels/{labelID} [delete]
func (app *application) deleteLabelHandler(w http.ResponseWriter, r *http.Request) {
	label := app.contextLabel(r)

	issueCount, err := app.store.Labels.Delete(r.Context(), label.ID)

	if err != nil {
		switch {
		case errors.Is(err, store.ErrNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	app.publish(r, realtime.Event{Type: realtime.TypeProjectLabelsChanged, ProjectID: label.ProjectID})

	env := envelope{
		"message":     "label deleted successfully",
		"issue_count": issueCount,
	}

	if err := app.writeJSON(w, http.StatusOK, env, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// @Summary Apply a label to an issue
// @Description Anyone in the project. The label must belong to the issue's project (422 otherwise). Applying a label the issue already has changes nothing and returns 200.
// @Tags issues
// @Accept json
// @Produce json
// @Param issueID path int true "Issue ID"
// @Param payload body AddIssueLabelPayload true "Label to apply"
// @Success 201 {object} store.LabelSummary
// @Success 200 {object} store.LabelSummary
// @Failure 400 {object} error
// @Failure 404 {object} error
// @Failure 422 {object} error
// @Failure 500 {object} error
// @Security BearerAuth
// @Router /issues/{issueID}/labels [post]
func (app *application) addIssueLabelHandler(w http.ResponseWriter, r *http.Request) {
	issue := app.contextIssue(r)

	var payload AddIssueLabelPayload

	if err := app.readJSON(w, r, &payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	v := validator.New()

	if v.Check(payload.LabelID > 0, "label_id", "must be a valid label id"); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	label, added, err := app.store.Issues.AddLabel(r.Context(), issue.ID, issue.ProjectID, payload.LabelID, app.contextUserID(r))

	if err != nil {
		switch {
		case errors.Is(err, store.ErrLabelNotInProject):
			v.AddError("label_id", err.Error())
			app.failedValidationResponse(w, r, v.Errors)
		case errors.Is(err, store.ErrNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	app.publish(r, realtime.Event{Type: realtime.TypeIssueUpdated, ProjectID: issue.ProjectID, IssueID: issue.ID})

	status := http.StatusCreated

	if !added {
		status = http.StatusOK
	}

	if err := app.writeJSON(w, status, envelope{"label": label}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// @Summary Remove a label from an issue
// @Tags issues
// @Produce json
// @Param issueID path int true "Issue ID"
// @Param labelID path int true "Label ID"
// @Success 200 {object} object
// @Failure 400 {object} error
// @Failure 404 {object} error
// @Failure 500 {object} error
// @Security BearerAuth
// @Router /issues/{issueID}/labels/{labelID} [delete]
func (app *application) removeIssueLabelHandler(w http.ResponseWriter, r *http.Request) {
	issue := app.contextIssue(r)

	labelID, err := app.readLabelIDParam(r)

	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	err = app.store.Issues.RemoveLabel(r.Context(), issue.ID, labelID, app.contextUserID(r))

	if err != nil {
		switch {
		case errors.Is(err, store.ErrNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	app.publish(r, realtime.Event{Type: realtime.TypeIssueUpdated, ProjectID: issue.ProjectID, IssueID: issue.ID})

	if err := app.writeJSON(w, http.StatusOK, envelope{"message": "label removed successfully"}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// labelWriteErrorResponse maps the errors of creating or editing a label.
func (app *application) labelWriteErrorResponse(w http.ResponseWriter, r *http.Request, err error) {
	switch {
	case errors.Is(err, store.ErrDuplicateLabel):
		app.conflictResponse(w, r, err)
	case errors.Is(err, store.ErrNotFound):
		app.notFoundResponse(w, r)
	default:
		app.serverErrorResponse(w, r, err)
	}
}
