package config

import (
	"errors"
	"fmt"
)

// ErrValidation is returned when the parsed configuration is not valid.
// It is recommended to check for such errors using
// `errors.Is(err, ErrValidation)`.
var ErrValidation = errors.New("failed to validate operator configuration")

func validationError(err error) error {
	return fmt.Errorf("%w: %v", ErrValidation, err)
}

type errMissingField struct {
	field string
}

func (e *errMissingField) Error() string {
	return "missing required field: " + e.field
}

type errBadConstant struct {
	field         string
	expectedValue string
	actualValue   string
}

func (e *errBadConstant) Error() string {
	return fmt.Sprintf(
		"invalid value for %s: got `%s`, expected `%s`",
		e.field, e.actualValue, e.expectedValue,
	)
}

// Use either `reason` or `err` (the latter will take precedence)
type errBadValue struct {
	field  string
	reason string
	err    error
}

func (e *errBadValue) Error() string {
	if e.err != nil {
		return fmt.Sprintf("invalid value for %s: %v", e.field, e.err)
	}
	return fmt.Sprintf("invalid value for %s: %s", e.field, e.reason)
}
