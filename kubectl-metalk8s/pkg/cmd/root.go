package cmd

import (
	"github.com/spf13/cobra"
)

func NewRootCommand() *cobra.Command {
	return &cobra.Command{
		Use:   "kubectl-metalk8s",
		Short: "Manage MetalK8s objects",
	}
}
