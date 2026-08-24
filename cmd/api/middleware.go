package main

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"github.com/sudarshanpokhrell/trackforge/internal/store"
	"github.com/sudarshanpokhrell/trackforge/internal/validator"
)

type contextKey string

const userCtx contextKey = "user"

const authCookieName = "jwt_token"

var errNoToken = errors.New("no authentication token in request")

func tokenFromRequest(r *http.Request) (string, error) {
	if header := r.Header.Get("Authorization"); header != "" {
		scheme, token, found := strings.Cut(header, " ")

		if !found || !strings.EqualFold(scheme, "Bearer") || token == "" {
			return "", errors.New("authorization header must be in the form: Bearer <token>")
		}

		return token, nil
	}

	cookie, err := r.Cookie(authCookieName)

	if err != nil {
		return "", errNoToken
	}

	return cookie.Value, nil
}

func (app *application) AuthTokenMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token, err := tokenFromRequest(r)

		if err != nil {
			if errors.Is(err, errNoToken) {
				app.authenticationRequiredResponse(w, r)
			} else {
				app.invalidAuthenticationResponse(w, r)
			}
			return
		}

		jwtToken, err := app.authenticator.ValidateToken(token)

		if err != nil {
			app.invalidAuthenticationResponse(w, r)
			return
		}

		claims, ok := jwtToken.Claims.(jwt.MapClaims)

		if !ok {
			app.invalidAuthenticationResponse(w, r)
			return
		}

		userID, ok := claims["sub"].(string)

		if !ok || !validator.UUIDRX.MatchString(userID) {
			app.invalidAuthenticationResponse(w, r)
			return
		}

		user, err := app.store.Users.GetById(r.Context(), userID)
		if err != nil {
			switch {
			case errors.Is(err, store.ErrNotFound):
				app.invalidAuthenticationResponse(w, r)
			default:
				app.serverErrorResponse(w, r, err)
			}
			return
		}

		ctx := context.WithValue(r.Context(), userCtx, user)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
