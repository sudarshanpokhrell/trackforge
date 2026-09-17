package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"maps"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/sudarshanpokhrell/trackforge/internal/store"
	"github.com/sudarshanpokhrell/trackforge/internal/validator"
)

type envelope map[string]any

func (app *application) writeJSON(w http.ResponseWriter, status int, data envelope, headers http.Header) error {
	js, err := json.Marshal(data)

	if err != nil {
		return err
	}

	maps.Copy(w.Header(), headers)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	w.Write(js)
	return nil
}

func (app *application) readJSON(w http.ResponseWriter, r *http.Request, dst interface{}) error {
	max_bytes := 1_048_576
	r.Body = http.MaxBytesReader(w, r.Body, int64(max_bytes))

	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()

	err := dec.Decode(dst)

	if err != nil {
		var syntaxError *json.SyntaxError
		var unmarshalTypeError *json.UnmarshalTypeError
		var invalidUnmarshalError *json.InvalidUnmarshalError
		var timeParseError *time.ParseError

		switch {
		case errors.As(err, &syntaxError):
			return fmt.Errorf("body contains badly-formed JSON (at character %d) ", syntaxError.Offset)

		case errors.Is(err, io.ErrUnexpectedEOF):
			return errors.New("body contains badly-formed JSON")

		case errors.As(err, &unmarshalTypeError):
			if unmarshalTypeError.Field != "" {
				return fmt.Errorf("body contains incorrect JSON type for field %q", unmarshalTypeError.Field)
			}
			return fmt.Errorf("body contains incorrect JSON type (at character %d)", unmarshalTypeError.Offset)

		case errors.As(err, &timeParseError):
			return fmt.Errorf("body contains an invalid date/time value %q; use RFC 3339, e.g. 2006-01-02T15:04:05Z", timeParseError.Value)

		case errors.Is(err, io.EOF):
			return errors.New("body must not be empty.")

		case strings.HasPrefix(err.Error(), "json: unknown field "):
			fieldName := strings.TrimPrefix(err.Error(), "json: unknown field ")
			return fmt.Errorf("body contains unknown key %s", fieldName)

		case err.Error() == "http: request body too large":
			return fmt.Errorf("body must not be longer than %d bytes", max_bytes)

		case errors.As(err, &invalidUnmarshalError):
			panic(err)

		default:
			return err
		}

	}
	err = dec.Decode(&struct{}{})

	if err != io.EOF {
		return errors.New("body must contain a single JSON value.")
	}

	return nil
}

func (app *application) readIDParam(r *http.Request) (int64, error) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)

	if err != nil || id < 1 {
		return 0, errors.New("invalid id parameter")
	}

	return id, nil
}

func (app *application) readCommentIDParam(r *http.Request) (int64, error) {
	id, err := strconv.ParseInt(chi.URLParam(r, "commentID"), 10, 64)

	if err != nil || id < 1 {
		return 0, errors.New("invalid comment id parameter")
	}

	return id, nil
}

func (app *application) readIssueIDParam(r *http.Request) (int64, error) {
	id, err := strconv.ParseInt(chi.URLParam(r, "issueID"), 10, 64)

	if err != nil || id < 1 {
		return 0, errors.New("invalid issue id parameter")
	}

	return id, nil
}

func (app *application) readLabelIDParam(r *http.Request) (int64, error) {
	id, err := strconv.ParseInt(chi.URLParam(r, "labelID"), 10, 64)

	if err != nil || id < 1 {
		return 0, errors.New("invalid label id parameter")
	}

	return id, nil
}

func (app *application) readCycleIDParam(r *http.Request) (int64, error) {
	id, err := strconv.ParseInt(chi.URLParam(r, "cycleID"), 10, 64)

	if err != nil || id < 1 {
		return 0, errors.New("invalid cycle id parameter")
	}

	return id, nil
}

func (app *application) readUserIDParam(r *http.Request) (string, error) {
	userID := chi.URLParam(r, "userID")

	if !validator.UUIDRX.MatchString(userID) {
		return "", errors.New("invalid user id parameter")
	}

	return userID, nil
}

func (app *application) contextUser(r *http.Request) *store.User {
	user, ok := r.Context().Value(userCtx).(*store.User)
	if !ok {
		panic("missing user in request context")
	}
	return user
}

func (app *application) contextUserID(r *http.Request) string {
	return app.contextUser(r).ID
}

func (app *application) contextComment(r *http.Request) *store.ProjectComment {
	comment, ok := r.Context().Value(commentCtx).(*store.ProjectComment)
	if !ok {
		panic("missing comment in request context")
	}
	return comment
}

func (app *application) contextIssue(r *http.Request) *store.Issue {
	issue, ok := r.Context().Value(issueCtx).(*store.Issue)
	if !ok {
		panic("missing issue in request context")
	}
	return issue
}

func (app *application) contextIssueComment(r *http.Request) *store.IssueComment {
	comment, ok := r.Context().Value(issueCommentCtx).(*store.IssueComment)
	if !ok {
		panic("missing issue comment in request context")
	}
	return comment
}

func (app *application) contextLabel(r *http.Request) *store.Label {
	label, ok := r.Context().Value(labelCtx).(*store.Label)
	if !ok {
		panic("missing label in request context")
	}
	return label
}

func (app *application) contextCycle(r *http.Request) *store.Cycle {
	cycle, ok := r.Context().Value(cycleCtx).(*store.Cycle)
	if !ok {
		panic("missing cycle in request context")
	}
	return cycle
}

// today is the current date in APP_TIMEZONE, which is what a cycle's status is
// measured against.
func (app *application) today() time.Time {
	return time.Now().In(app.config.app.timezone)
}

// nullableInt64 is a JSON field that tells "left out" (Set is false) apart from
// an explicit null (Set is true, Value is nil).
type nullableInt64 struct {
	Set   bool
	Value *int64
}

func (n *nullableInt64) UnmarshalJSON(data []byte) error {
	n.Set = true

	if string(data) == "null" {
		n.Value = nil
		return nil
	}

	var v int64

	if err := json.Unmarshal(data, &v); err != nil {
		return err
	}

	n.Value = &v

	return nil
}

// contextProjectAccess reports who the caller is in the project the access
// middleware resolved for this request.
func (app *application) contextProjectAccess(r *http.Request) store.ProjectAccess {
	access, ok := r.Context().Value(projectAccessCtx).(store.ProjectAccess)
	if !ok {
		panic("missing project access in request context")
	}
	return access
}
