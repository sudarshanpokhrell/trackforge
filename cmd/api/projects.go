package main

import "net/http"

func (app *application) createProjectHandler(w http.ResponseWriter, r *http.Request) {

	app.writeJSON(w, http.StatusCreated, nil, nil)
}

func (app *application) getUserProjectsHandler(w http.ResponseWriter, r *http.Request) {
	app.writeJSON(w, http.StatusOK, nil, nil)
}

func (app *application) getProjectByIDHandler(w http.ResponseWriter, r *http.Request) {
	app.writeJSON(w, http.StatusOK, nil, nil)
}

func (app *application) updateProjectHandler(w http.ResponseWriter, r *http.Request) {
	app.writeJSON(w, http.StatusOK, nil, nil)
}

func (app *application) deleteProjectHandler(w http.ResponseWriter, r *http.Request) {
	app.writeJSON(w, http.StatusOK, nil, nil)
}
