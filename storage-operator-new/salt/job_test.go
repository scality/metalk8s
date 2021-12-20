package salt

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNew(t *testing.T) {
	assert := assert.New(t)
	job := newJob("ping", "deadbeef")

	assert.NotNil(job)
	assert.Equal("ping", job.Name)
	assert.Equal("deadbeef", job.ID)
	assert.Equal("ping/deadbeef", job.String())
}

func TestFromString(t *testing.T) {
	assert := assert.New(t)
	tests := map[string]struct {
		input    string
		success  bool
		expected *JobHandle
	}{
		"empty":   {input: "", success: true, expected: &JobHandle{"", ""}},
		"valid":   {input: "ping/pong", success: true, expected: &JobHandle{"ping", "pong"}},
		"invalid": {input: "ping:pong", success: false, expected: nil},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			job, err := JobFromString(tc.input)

			if tc.success {
				assert.Equal(tc.expected, job)
			} else {
				assert.Error(err)
			}
		})
	}
}
