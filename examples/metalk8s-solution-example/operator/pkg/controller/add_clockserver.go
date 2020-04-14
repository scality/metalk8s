package controller

import (
	"example-solution-operator/pkg/controller/clockserver"
)

func init() {
	// AddToManagerFuncs is a list of functions to create controllers and add them to a manager.
	AddToManagerFuncs = append(AddToManagerFuncs, clockserver.Add)
}
