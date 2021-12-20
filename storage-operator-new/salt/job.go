package salt

import (
	"fmt"
	"strings"
)

// A Salt job handle.
type JobHandle struct {
	Name string
	ID   string
}

func newJob(name string, id string) *JobHandle {
	return &JobHandle{Name: name, ID: id}
}

func JobFromString(s string) (*JobHandle, error) {
	if len(s) == 0 {
		return &JobHandle{"", ""}, nil
	}

	parts := strings.SplitN(s, "/", 3)
	// Keep len 3 to support the old format, just in case…
	if len(parts) == 2 || len(parts) == 3 {
		return &JobHandle{parts[0], parts[1]}, nil
	} else {
		return nil, fmt.Errorf("invalid job format: %s", s)
	}
}

// Get the string representation of a job handle.
func (job *JobHandle) String() string {
	return fmt.Sprintf("%s/%s", job.Name, job.ID)
}
