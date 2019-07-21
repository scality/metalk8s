package salt

import (
	"time"
)

// A Salt API authentication token.
type authToken struct {
	value  string    // Authentication token.
	expire time.Time // Expiration date of the token.
}

// Create a new Salt API authentication token.
//
// Arguments
//     token:  the token.
//     expire: the token expiration date, as an UNIX timestamp.
//
// Returns
//     An authentication token.
func newToken(token string, expire float64) *authToken {
	return &authToken{
		value:  token,
		expire: time.Unix(int64(expire), 0).UTC(),
	}
}

// Check if the token is expired.
func (self *authToken) isExpired() bool {
	return time.Now().UTC().After(self.expire)
}
