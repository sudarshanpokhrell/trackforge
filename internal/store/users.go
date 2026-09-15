package store

//TODO: Don't need to make it repetivate code reusable (one or 2 is. onyl present)
import (
	"context"
	"database/sql"
	"errors"

	"github.com/lib/pq"
	"github.com/sudarshanpokhrell/trackforge/internal/validator"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrDuplicateEmail = errors.New("email already exists")
	ErrSetupDone      = errors.New("setup has already been completed")
)

// App-wide user roles. Distinct from the per-project roles in memberships.go.
const (
	UserRoleSuperadmin = "superadmin"
	UserRoleAdmin      = "admin"
	UserRoleMember     = "member"
)

var userRoleRanks = map[string]int{
	UserRoleMember:     1,
	UserRoleAdmin:      2,
	UserRoleSuperadmin: 3,
}

func UserRoleAtLeast(role, min string) bool {
	return userRoleRanks[role] != 0 && userRoleRanks[role] >= userRoleRanks[min]
}

type password struct {
	text *string
	hash []byte
}

func (p *password) Set(plainTextPassword string) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(plainTextPassword), 12)

	if err != nil {
		return err
	}

	p.text = &plainTextPassword
	p.hash = hash

	return nil

}

func (p *password) Compare(plainText string) (bool, error) {
	err := bcrypt.CompareHashAndPassword(p.hash, []byte(plainText))

	if err != nil {
		if errors.Is(err, bcrypt.ErrMismatchedHashAndPassword) {
			return false, nil
		}
		return false, err
	}

	return true, nil
}

func ValidateEmail(v *validator.Validator, email string) {
	v.Check(email != "", "email", "must be provided")
	v.Check(v.Matches(email, validator.EmailRX), "email", "must be a valid email address")
}

func ValidatePasswordPlaintext(v *validator.Validator, password string) {
	ValidatePasswordField(v, "password", password)
}

// ValidatePasswordField applies the password rules, reporting errors under key.
func ValidatePasswordField(v *validator.Validator, key, password string) {
	v.Check(password != "", key, "must be provided")
	v.Check(len(password) >= 8, key, "must be at least 8 bytes long")
	v.Check(len(password) <= 72, key, "must not be more that 72 bytes")
}

// ValidateAssignableRole checks a role handed out through user management.
// superadmin is never assignable: the only way to it is a transfer.
func ValidateAssignableRole(v *validator.Validator, role string) {
	v.Check(v.In(role, UserRoleAdmin, UserRoleMember), "role", "must be one of admin or member")
}

func ValidateUserName(v *validator.Validator, name string) {
	v.Check(name != "", "name", "must be provided.")
	v.Check(len(name) <= 500, "name", "must not be more than 500 bytes long")
}

func ValidateUser(v *validator.Validator, user *User) {
	ValidateUserName(v, user.Name)

	ValidateEmail(v, user.Email)

	if user.Password.text != nil {
		ValidatePasswordPlaintext(v, *user.Password.text)
	}

	if user.Password.hash == nil {
		panic("missing password hash for user.")
	}
}

type User struct {
	ID                 string   `json:"id"`
	Name               string   `json:"name"`
	Email              string   `json:"email"`
	Password           password `json:"-"`
	Role               string   `json:"role"`
	IsActive           bool     `json:"is_active"`
	MustChangePassword bool     `json:"must_change_password"`
	CreatedAt          string   `json:"created_at"`
	UpdatedAt          string   `json:"updated_at"`
}

type UserStore struct {
	db *sql.DB
}

// Create inserts user with the role and must_change_password already set on it.
func (s *UserStore) Create(ctx context.Context, user *User) error {
	query := `
		INSERT INTO users (name, email, password, role, must_change_password)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, is_active, created_at, updated_at
	`
	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	err := s.db.QueryRowContext(ctx, query, user.Name, user.Email, user.Password.hash, user.Role, user.MustChangePassword).Scan(
		&user.ID,
		&user.IsActive,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	return translateUserError(err)
}

func (s *UserStore) SuperadminExists(ctx context.Context) (bool, error) {
	query := `SELECT EXISTS (SELECT 1 FROM users WHERE role = 'superadmin')`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	var exists bool
	err := s.db.QueryRowContext(ctx, query).Scan(&exists)

	return exists, err
}

const userColumns = `id, name, email, password, role, is_active, must_change_password, created_at, updated_at`

func (s *UserStore) GetById(ctx context.Context, id string) (*User, error) {
	query := `SELECT ` + userColumns + ` FROM users WHERE id = $1`

	return s.getOne(ctx, query, id)
}

func (s *UserStore) GetByEmail(ctx context.Context, email string) (*User, error) {
	query := `SELECT ` + userColumns + ` FROM users WHERE email = $1`

	return s.getOne(ctx, query, email)
}

// List returns every user, oldest first. A nil active returns both active and
// deactivated users.
func (s *UserStore) List(ctx context.Context, active *bool) ([]*User, error) {
	query := `SELECT ` + userColumns + ` FROM users
		WHERE ($1::boolean IS NULL OR is_active = $1)
		ORDER BY created_at, id`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	rows, err := s.db.QueryContext(ctx, query, active)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := []*User{}

	for rows.Next() {
		user, err := scanUser(rows)

		if err != nil {
			return nil, err
		}

		users = append(users, user)
	}

	return users, rows.Err()
}

// Update writes every mutable field of user (name, role, is_active,
// must_change_password and the password hash) and refreshes UpdatedAt.
func (s *UserStore) Update(ctx context.Context, user *User) error {
	query := `
		UPDATE users
		SET name = $1, role = $2, is_active = $3, must_change_password = $4, password = $5
		WHERE id = $6
		RETURNING updated_at
	`

	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	err := s.db.QueryRowContext(ctx, query,
		user.Name,
		user.Role,
		user.IsActive,
		user.MustChangePassword,
		user.Password.hash,
		user.ID,
	).Scan(&user.UpdatedAt)

	if errors.Is(err, sql.ErrNoRows) {
		return ErrNotFound
	}

	return translateUserError(err)
}

func (s *UserStore) getOne(ctx context.Context, query string, arg any) (*User, error) {
	ctx, cancel := context.WithTimeout(ctx, QueryTimeOutDuration)
	defer cancel()

	user, err := scanUser(s.db.QueryRowContext(ctx, query, arg))

	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return nil, ErrNotFound
		default:
			return nil, err
		}
	}

	return user, nil
}

// scanUser reads one row selected with userColumns.
func scanUser(row interface{ Scan(...any) error }) (*User, error) {
	user := &User{}

	err := row.Scan(
		&user.ID,
		&user.Name,
		&user.Email,
		&user.Password.hash,
		&user.Role,
		&user.IsActive,
		&user.MustChangePassword,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	return user, err
}

func translateUserError(err error) error {
	var pqErr *pq.Error

	if errors.As(err, &pqErr) && pqErr.Code.Name() == "unique_violation" {
		switch pqErr.Constraint {
		case "users_email_key":
			return ErrDuplicateEmail
		case "users_single_superadmin":
			return ErrSetupDone
		}
	}

	return err
}
