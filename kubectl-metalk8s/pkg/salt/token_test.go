package salt

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestIsExpired(t *testing.T) {
	tests := map[string]struct {
		expire   float64
		expected bool
	}{
		"valid":   {expire: 2147472000, expected: false},
		"expired": {expire: 0, expected: true},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			token := newToken("value", tc.expire)

			is_expired := token.isExpired()

			assert.Equal(t, tc.expected, is_expired)
		})
	}
}
