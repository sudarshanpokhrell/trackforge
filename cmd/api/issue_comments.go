package main

import (
	"errors"
	"net/http"

	"github.com/sudarshanpokhrell/trackforge/internal/store"
	"github.com/sudarshanpokhrell/trackforge/internal/validator"
)

type CreateIssueCommentPayload struct {
	Content string `json:"content"`
}

type UpdateIssueCommentPayload struct {
	Content string `json:"content"`
}

// @Summary List an issue's comments
// @Description Comments are returned newest first, each with a summary of its author.
// @Tags issue-comments
// @Produce json
// @Param issueID path int true "Issue ID"
// @Success 200 {array} store.IssueComment
// @Failure 400 {object} error
// @Failure 404 {object} error
// @Failure 500 {object} error
// @Security BearerAuth
// @Router /issues/{issueID}/comments [get]
func (app *application) listIssueCommentsHandler(w http.ResponseWriter, r *http.Request) {
	issue := app.contextIssue(r)

	comments, err := app.store.IssueComments.GetByIssueID(r.Context(), issue.ID)

	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	if err := app.writeJSON(w, http.StatusOK, envelope{"comments": comments}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// @Summary Post a comment on an issue
// @Tags issue-comments
// @Accept json
// @Produce json
// @Param issueID path int true "Issue ID"
// @Param payload body CreateIssueCommentPayload true "Comment content"
// @Success 201 {object} store.IssueComment
// @Failure 400 {object} error
// @Failure 404 {object} error
// @Failure 422 {object} error
// @Failure 500 {object} error
// @Security BearerAuth
// @Router /issues/{issueID}/comments [post]
func (app *application) createIssueCommentHandler(w http.ResponseWriter, r *http.Request) {
	issue := app.contextIssue(r)

	var payload CreateIssueCommentPayload

	if err := app.readJSON(w, r, &payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	user := app.contextUser(r)

	comment := store.IssueComment{
		IssueID:  issue.ID,
		AuthorID: user.ID,
		Content:  payload.Content,
	}

	v := validator.New()

	if store.ValidateIssueComment(v, &comment); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	if err := app.store.IssueComments.Create(r.Context(), &comment); err != nil {
		switch {
		case errors.Is(err, store.ErrNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	// The insert cannot return the author, but it is the caller — fill it in so
	// the response matches the shape the list endpoint returns.
	comment.Author = &store.UserSummary{
		ID:    user.ID,
		Name:  user.Name,
		Email: user.Email,
	}

	if err := app.writeJSON(w, http.StatusCreated, envelope{"comment": comment}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// @Summary Edit an issue comment
// @Description Only the comment's author or a project admin may edit it.
// @Tags issue-comments
// @Accept json
// @Produce json
// @Param issueID path int true "Issue ID"
// @Param commentID path int true "Comment ID"
// @Param payload body UpdateIssueCommentPayload true "New content"
// @Success 200 {object} store.IssueComment
// @Failure 400 {object} error
// @Failure 403 {object} error
// @Failure 404 {object} error
// @Failure 409 {object} error
// @Failure 422 {object} error
// @Failure 500 {object} error
// @Security BearerAuth
// @Router /issues/{issueID}/comments/{commentID} [patch]
func (app *application) updateIssueCommentHandler(w http.ResponseWriter, r *http.Request) {
	comment := app.contextIssueComment(r)

	var payload UpdateIssueCommentPayload

	if err := app.readJSON(w, r, &payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	comment.Content = payload.Content

	v := validator.New()

	if store.ValidateIssueComment(v, comment); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	if err := app.store.IssueComments.Update(r.Context(), comment); err != nil {
		switch {
		case errors.Is(err, store.ErrEditConflict):
			app.editConflictResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	if err := app.writeJSON(w, http.StatusOK, envelope{"comment": comment}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// @Summary Delete an issue comment
// @Description Only the comment's author or a project admin may delete it.
// @Tags issue-comments
// @Produce json
// @Param issueID path int true "Issue ID"
// @Param commentID path int true "Comment ID"
// @Success 200 {object} object
// @Failure 400 {object} error
// @Failure 403 {object} error
// @Failure 404 {object} error
// @Failure 500 {object} error
// @Security BearerAuth
// @Router /issues/{issueID}/comments/{commentID} [delete]
func (app *application) deleteIssueCommentHandler(w http.ResponseWriter, r *http.Request) {
	comment := app.contextIssueComment(r)

	if err := app.store.IssueComments.Delete(r.Context(), comment.ID); err != nil {
		switch {
		case errors.Is(err, store.ErrNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	if err := app.writeJSON(w, http.StatusOK, envelope{"message": "comment deleted successfully"}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
