package controller

import (
	"example-solution-operator/pkg/controller/versionserver"
)

func init() {
	// AddToManagerFuncs is a list of functions to create controllers and add them to a manager.
	AddToManagerFuncs = append(AddToManagerFuncs, versionserver.Add)
}
