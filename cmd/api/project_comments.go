package main

import (
	"errors"
	"net/http"

	"github.com/sudarshanpokhrell/trackforge/internal/store"
	"github.com/sudarshanpokhrell/trackforge/internal/validator"
)

type CreateProjectCommentPayload struct {
	Content string `json:"content"`
}

type UpdateProjectCommentPayload struct {
	Content string `json:"content"`
}

// @Summary List a project's comments
// @Description Comments are returned newest first, each with a summary of its creator.
// @Tags comments
// @Produce json
// @Param id path int true "Project ID"
// @Success 200 {array} store.ProjectComment
// @Failure 400 {object} error
// @Failure 404 {object} error
// @Failure 500 {object} error
// @Security BearerAuth
// @Router /projects/{id}/comments [get]
func (app *application) getProjectCommentsHandler(w http.ResponseWriter, r *http.Request) {
	projectID, err := app.readIDParam(r)

	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	comments, err := app.store.Comments.GetByProjectID(r.Context(), projectID)

	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	if err := app.writeJSON(w, http.StatusOK, envelope{"comments": comments}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// @Summary Post a comment on a project
// @Tags comments
// @Accept json
// @Produce json
// @Param id path int true "Project ID"
// @Param payload body CreateProjectCommentPayload true "Comment content"
// @Success 201 {object} store.ProjectComment
// @Failure 400 {object} error
// @Failure 404 {object} error
// @Failure 422 {object} error
// @Failure 500 {object} error
// @Security BearerAuth
// @Router /projects/{id}/comments [post]
func (app *application) createProjectCommentHandler(w http.ResponseWriter, r *http.Request) {
	projectID, err := app.readIDParam(r)

	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	var payload CreateProjectCommentPayload

	if err := app.readJSON(w, r, &payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	user := app.contextUser(r)

	comment := store.ProjectComment{
		Content:   payload.Content,
		ProjectID: projectID,
		CreatedBy: user.ID,
	}

	v := validator.New()

	if store.ValidateComment(v, &comment); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	if err := app.store.Comments.Create(r.Context(), &comment); err != nil {
		switch {
		case errors.Is(err, store.ErrNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	// The insert cannot return the creator, but it is the caller — fill it in so
	// the response matches the shape the list endpoint returns.
	comment.Creator = &store.UserSummary{
		ID:    user.ID,
		Name:  user.Name,
		Email: user.Email,
	}

	if err := app.writeJSON(w, http.StatusCreated, envelope{"comment": comment}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// @Summary Edit a comment
// @Description Only the comment's author or a project admin may edit it.
// @Tags comments
// @Accept json
// @Produce json
// @Param id path int true "Project ID"
// @Param commentID path int true "Comment ID"
// @Param payload body UpdateProjectCommentPayload true "New content"
// @Success 200 {object} store.ProjectComment
// @Failure 400 {object} error
// @Failure 403 {object} error
// @Failure 404 {object} error
// @Failure 409 {object} error
// @Failure 422 {object} error
// @Failure 500 {object} error
// @Security BearerAuth
// @Router /projects/{id}/comments/{commentID} [patch]
func (app *application) updateProjectCommentHandler(w http.ResponseWriter, r *http.Request) {
	comment := app.contextComment(r)

	var payload UpdateProjectCommentPayload

	if err := app.readJSON(w, r, &payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	comment.Content = payload.Content

	v := validator.New()

	if store.ValidateComment(v, comment); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	if err := app.store.Comments.Update(r.Context(), comment); err != nil {
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

// @Summary Delete a comment
// @Description Only the comment's author or a project admin may delete it.
// @Tags comments
// @Produce json
// @Param id path int true "Project ID"
// @Param commentID path int true "Comment ID"
// @Success 200 {object} object
// @Failure 400 {object} error
// @Failure 403 {object} error
// @Failure 404 {object} error
// @Failure 500 {object} error
// @Security BearerAuth
// @Router /projects/{id}/comments/{commentID} [delete]
func (app *application) deleteProjectCommentHandler(w http.ResponseWriter, r *http.Request) {
	comment := app.contextComment(r)

	if err := app.store.Comments.Delete(r.Context(), comment.ID); err != nil {
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
