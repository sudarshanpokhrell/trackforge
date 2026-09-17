package main

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/sudarshanpokhrell/trackforge/internal/store"
	"github.com/sudarshanpokhrell/trackforge/internal/validator"
)

type SetCyclesEnabledPayload struct {
	Enabled *bool `json:"enabled"`
}

type CreateCyclePayload struct {
	Name        string    `json:"name"`
	Description string    `json:"description"`
	StartDate   time.Time `json:"start_date"`
	EndDate     time.Time `json:"end_date"`
}

// UpdateCyclePayload is a patch: a field left out keeps its current value.
type UpdateCyclePayload struct {
	Name        *string    `json:"name"`
	Description *string    `json:"description"`
	StartDate   *time.Time `json:"start_date"`
	EndDate     *time.Time `json:"end_date"`
}

type CompleteCyclePayload struct {
	// MoveOpenIssuesTo is another uncompleted cycle in the project, or null (or
	// left out) to leave open issues with no cycle.
	MoveOpenIssuesTo *int64 `json:"move_open_issues_to"`
}

// @Summary Turn cycles on or off for a project
// @Description Project admins and the superadmin only. Turning cycles off is refused (422) while the project has an uncompleted cycle.
// @Tags cycles
// @Accept json
// @Produce json
// @Param id path int true "Project ID"
// @Param payload body SetCyclesEnabledPayload true "Whether cycles are on"
// @Success 200 {object} object
// @Failure 400 {object} error
// @Failure 403 {object} error
// @Failure 404 {object} error
// @Failure 422 {object} error
// @Failure 500 {object} error
// @Security BearerAuth
// @Router /projects/{id}/cycles-enabled [put]
func (app *application) setCyclesEnabledHandler(w http.ResponseWriter, r *http.Request) {
	projectID, err := app.readIDParam(r)

	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	var payload SetCyclesEnabledPayload

	if err := app.readJSON(w, r, &payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	v := validator.New()

	if v.Check(payload.Enabled != nil, "enabled", "must be provided"); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	err = app.store.Projects.SetCyclesEnabled(r.Context(), projectID, *payload.Enabled)

	if err != nil {
		switch {
		case errors.Is(err, store.ErrOpenCyclesExist):
			app.errorResponse(w, r, http.StatusUnprocessableEntity, err.Error())
		case errors.Is(err, store.ErrNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	if err := app.writeJSON(w, http.StatusOK, envelope{"cycles_enabled": *payload.Enabled}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// @Summary List a project's cycles
// @Description Latest start first. Each cycle has its status (upcoming, active, overdue, completed; worked out in APP_TIMEZONE) and issue counts per issue status. Filter with ?status=.
// @Tags cycles
// @Produce json
// @Param id path int true "Project ID"
// @Param status query string false "upcoming, active, overdue or completed"
// @Success 200 {array} store.Cycle
// @Failure 400 {object} error
// @Failure 404 {object} error
// @Failure 422 {object} error
// @Failure 500 {object} error
// @Security BearerAuth
// @Router /projects/{id}/cycles [get]
func (app *application) listCyclesHandler(w http.ResponseWriter, r *http.Request) {
	projectID, err := app.readIDParam(r)

	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	status := r.URL.Query().Get("status")

	v := validator.New()

	if status != "" {
		if v.Check(v.In(status, store.CycleStatuses...), "status", "must be upcoming, active, overdue or completed"); !v.Valid() {
			app.failedValidationResponse(w, r, v.Errors)
			return
		}
	}

	cycles, err := app.store.Cycles.ListByProject(r.Context(), projectID)

	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	today := app.today()
	matching := []*store.Cycle{}

	// Status depends on today, so it can't be a WHERE clause; a project has few
	// enough cycles that filtering here is fine.
	for _, cycle := range cycles {
		cycle.SetStatus(today)

		if status == "" || cycle.Status == status {
			matching = append(matching, cycle)
		}
	}

	if err := app.writeJSON(w, http.StatusOK, envelope{"cycles": matching}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// @Summary Create a cycle
// @Description Anyone in the project, while cycles are on (409 otherwise). Dates are inclusive and may not overlap another cycle in the project (422).
// @Tags cycles
// @Accept json
// @Produce json
// @Param id path int true "Project ID"
// @Param payload body CreateCyclePayload true "Cycle to create"
// @Success 201 {object} store.Cycle
// @Failure 400 {object} error
// @Failure 404 {object} error
// @Failure 409 {object} error
// @Failure 422 {object} error
// @Failure 500 {object} error
// @Security BearerAuth
// @Router /projects/{id}/cycles [post]
func (app *application) createCycleHandler(w http.ResponseWriter, r *http.Request) {
	projectID, err := app.readIDParam(r)

	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	var payload CreateCyclePayload

	if err := app.readJSON(w, r, &payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	userID := app.contextUserID(r)

	cycle := store.Cycle{
		ProjectID:   projectID,
		Name:        strings.TrimSpace(payload.Name),
		Description: strings.TrimSpace(payload.Description),
		StartDate:   payload.StartDate,
		EndDate:     payload.EndDate,
		CreatedBy:   &userID,
	}

	v := validator.New()

	if store.ValidateCycle(v, &cycle); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	if err := app.store.Cycles.Create(r.Context(), &cycle); err != nil {
		app.cycleWriteErrorResponse(w, r, err)
		return
	}

	cycle.SetStatus(app.today())

	if err := app.writeJSON(w, http.StatusCreated, envelope{"cycle": cycle}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// @Summary Get a cycle
// @Description Includes its status and issue counts per issue status, for progress.
// @Tags cycles
// @Produce json
// @Param id path int true "Project ID"
// @Param cycleID path int true "Cycle ID"
// @Success 200 {object} store.Cycle
// @Failure 400 {object} error
// @Failure 404 {object} error
// @Failure 500 {object} error
// @Security BearerAuth
// @Router /projects/{id}/cycles/{cycleID} [get]
func (app *application) getCycleHandler(w http.ResponseWriter, r *http.Request) {
	cycle := app.contextCycle(r)

	cycle.SetStatus(app.today())

	if err := app.writeJSON(w, http.StatusOK, envelope{"cycle": cycle}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// @Summary Edit a cycle
// @Description Anyone in the project, while cycles are on. Fields left out are unchanged. A completed cycle is read-only (422).
// @Tags cycles
// @Accept json
// @Produce json
// @Param id path int true "Project ID"
// @Param cycleID path int true "Cycle ID"
// @Param payload body UpdateCyclePayload true "Fields to change"
// @Success 200 {object} store.Cycle
// @Failure 400 {object} error
// @Failure 404 {object} error
// @Failure 409 {object} error
// @Failure 422 {object} error
// @Failure 500 {object} error
// @Security BearerAuth
// @Router /projects/{id}/cycles/{cycleID} [patch]
func (app *application) updateCycleHandler(w http.ResponseWriter, r *http.Request) {
	cycle := app.contextCycle(r)

	if cycle.CompletedAt != nil {
		app.errorResponse(w, r, http.StatusUnprocessableEntity, "a completed cycle can't be edited")
		return
	}

	var payload UpdateCyclePayload

	if err := app.readJSON(w, r, &payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if payload.Name != nil {
		cycle.Name = strings.TrimSpace(*payload.Name)
	}
	if payload.Description != nil {
		cycle.Description = strings.TrimSpace(*payload.Description)
	}
	if payload.StartDate != nil {
		cycle.StartDate = *payload.StartDate
	}
	if payload.EndDate != nil {
		cycle.EndDate = *payload.EndDate
	}

	v := validator.New()

	if store.ValidateCycle(v, cycle); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	if err := app.store.Cycles.Update(r.Context(), cycle); err != nil {
		app.cycleWriteErrorResponse(w, r, err)
		return
	}

	cycle.SetStatus(app.today())

	if err := app.writeJSON(w, http.StatusOK, envelope{"cycle": cycle}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// @Summary Delete a cycle
// @Description Anyone in the project, while cycles are on. Its issues stay, with no cycle.
// @Tags cycles
// @Produce json
// @Param id path int true "Project ID"
// @Param cycleID path int true "Cycle ID"
// @Success 200 {object} object
// @Failure 400 {object} error
// @Failure 404 {object} error
// @Failure 409 {object} error
// @Failure 500 {object} error
// @Security BearerAuth
// @Router /projects/{id}/cycles/{cycleID} [delete]
func (app *application) deleteCycleHandler(w http.ResponseWriter, r *http.Request) {
	cycle := app.contextCycle(r)

	if err := app.store.Cycles.Delete(r.Context(), cycle.ID); err != nil {
		switch {
		case errors.Is(err, store.ErrNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	if err := app.writeJSON(w, http.StatusOK, envelope{"message": "cycle deleted successfully"}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// @Summary Complete a cycle
// @Description Anyone in the project, while cycles are on. In one transaction: the cycle is marked completed, and its issues that aren't done or cancelled move to move_open_issues_to (another uncompleted cycle in the project) or to no cycle. Each moved issue gets a cycle_changed activity.
// @Tags cycles
// @Accept json
// @Produce json
// @Param id path int true "Project ID"
// @Param cycleID path int true "Cycle ID"
// @Param payload body CompleteCyclePayload false "Where open issues go"
// @Success 200 {object} object
// @Failure 400 {object} error
// @Failure 404 {object} error
// @Failure 409 {object} error
// @Failure 422 {object} error
// @Failure 500 {object} error
// @Security BearerAuth
// @Router /projects/{id}/cycles/{cycleID}/complete [post]
func (app *application) completeCycleHandler(w http.ResponseWriter, r *http.Request) {
	cycle := app.contextCycle(r)

	var payload CompleteCyclePayload

	// An empty body is fine: open issues go to no cycle.
	if r.ContentLength != 0 {
		if err := app.readJSON(w, r, &payload); err != nil {
			app.badRequestResponse(w, r, err)
			return
		}
	}

	moved, err := app.store.Cycles.Complete(r.Context(), cycle, payload.MoveOpenIssuesTo, app.contextUserID(r))

	if err != nil {
		switch {
		case errors.Is(err, store.ErrCycleCompleted):
			app.errorResponse(w, r, http.StatusUnprocessableEntity, err.Error())
		case errors.Is(err, store.ErrInvalidCycleTarget):
			v := validator.New()
			v.AddError("move_open_issues_to", err.Error())
			app.failedValidationResponse(w, r, v.Errors)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	env := envelope{
		"cycle":             cycle,
		"moved_issue_count": moved,
	}

	if err := app.writeJSON(w, http.StatusOK, env, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// cycleWriteErrorResponse maps the errors of creating or editing a cycle.
func (app *application) cycleWriteErrorResponse(w http.ResponseWriter, r *http.Request, err error) {
	switch {
	case errors.Is(err, store.ErrCycleOverlap):
		v := validator.New()
		v.AddError("dates", err.Error())
		app.failedValidationResponse(w, r, v.Errors)
	case errors.Is(err, store.ErrEditConflict):
		app.editConflictResponse(w, r)
	case errors.Is(err, store.ErrNotFound):
		app.notFoundResponse(w, r)
	default:
		app.serverErrorResponse(w, r, err)
	}
}

// issueCycleProblem says why an issue can't move from its current cycle to
// cycleID (nil meaning no cycle), or "" when it can. Completed cycles are
// read-only in both directions, and cycles must be on to put an issue in one.
func (app *application) issueCycleProblem(r *http.Request, issue *store.Issue, cycleID *int64) (string, error) {
	if issue.CycleID != nil {
		current, err := app.store.Cycles.GetByID(r.Context(), *issue.CycleID)

		if err != nil && !errors.Is(err, store.ErrNotFound) {
			return "", err
		}

		if current != nil && current.CompletedAt != nil {
			return "issues can't leave a completed cycle", nil
		}
	}

	if cycleID == nil {
		return "", nil
	}

	project, err := app.store.Projects.GetByID(r.Context(), issue.ProjectID)

	if err != nil {
		return "", err
	}

	if !project.CyclesEnabled {
		return store.ErrCyclesDisabled.Error(), nil
	}

	target, err := app.store.Cycles.GetByID(r.Context(), *cycleID)

	if errors.Is(err, store.ErrNotFound) || (err == nil && target.ProjectID != issue.ProjectID) {
		return store.ErrCycleNotInProject.Error(), nil
	}

	if err != nil {
		return "", err
	}

	if target.CompletedAt != nil {
		return "issues can't be added to a completed cycle", nil
	}

	return "", nil
}
