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

// func (app *application) contextProjectRole(r *http.Request) (string, bool) {
// 	role, ok := r.Context().Value(projectRoleCtx).(string)
// 	return role, ok
// }
