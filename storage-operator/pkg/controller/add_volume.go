package controller

import (
	"github.com/scality/metalk8s/storage-operator/pkg/controller/volume"
)

func init() {
	// AddToManagerFuncs is a list of functions to create controllers and add them to a manager.
	AddToManagerFuncs = append(AddToManagerFuncs, volume.Add)
}
