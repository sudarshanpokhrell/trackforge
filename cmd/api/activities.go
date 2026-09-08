package main

import (
	"net/http"
)

// @Summary Read an issue's activity trail
// @Description Append-only record of everything that has happened to the issue, oldest first. The payload's shape depends on the entry's type, e.g. {"from":"todo","to":"done"} for status_changed.
// @Tags activities
// @Produce json
// @Param issueID path int true "Issue ID"
// @Success 200 {array} store.IssueActivity
// @Failure 400 {object} error
// @Failure 404 {object} error
// @Failure 500 {object} error
// @Security BearerAuth
// @Router /issues/{issueID}/activities [get]
func (app *application) listIssueActivitiesHandler(w http.ResponseWriter, r *http.Request) {
	issue := app.contextIssue(r)

	activities, err := app.store.Activities.ListByIssue(r.Context(), issue.ID)

	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	if err := app.writeJSON(w, http.StatusOK, envelope{"activities": activities}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
