package controller

import (
	"github.com/scality/metalk8s/go/solution-operator-lib/pkg/config"

	"sigs.k8s.io/controller-runtime/pkg/manager"
)

// AddToManagerFuncs is a list of functions to add all Controllers to the Manager
var AddToManagerFuncs []func(manager.Manager, *config.OperatorConfig) error

// AddToManager adds all Controllers to the Manager
func AddToManager(m manager.Manager, config *config.OperatorConfig) error {
	for _, f := range AddToManagerFuncs {
		if err := f(m, config); err != nil {
			return err
		}
	}
	return nil
}
