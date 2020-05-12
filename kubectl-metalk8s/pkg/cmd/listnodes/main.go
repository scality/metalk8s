package listnodes

import (
	"context"
	"fmt"

	"github.com/spf13/cobra"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/cli-runtime/pkg/genericclioptions"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"

	"github.com/scality/metalk8s/kubectl-metalk8s/pkg/cmd"
)

func NewCommand(globalOptions *cmd.GlobalOptions) *cobra.Command {
	return &cobra.Command{
		Use:   "list-nodes",
		Short: "Test list all Kubernetes nodes",
		RunE: func(cmd *cobra.Command, args []string) error {
			cmd.SilenceUsage = true

			config, err := globalOptions.GetConfigFlags().ToRESTConfig()
			if err != nil {
				return err
			}

			return run(cmd.Context(), globalOptions.GetIOStreams(), config)
		},
	}
}

func run(ctx context.Context, streams *genericclioptions.IOStreams, config *rest.Config) error {
	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return err
	}

	nodes, err := clientset.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
	if err != nil {
		return err
	}

	fmt.Fprintf(streams.Out, "List of all nodes:\n")
	for _, n := range nodes.Items {
		fmt.Fprintf(streams.Out, "\t%s\n", n.Name)
	}

	return nil
}
