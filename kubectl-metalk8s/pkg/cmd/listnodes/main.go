package listnodes

import (
	"context"
	"fmt"

	"github.com/spf13/cobra"

	"github.com/scality/metalk8s/kubectl-metalk8s/pkg/cmd"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/cli-runtime/pkg/genericclioptions"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

type ListNodesOptions struct {
	config *rest.Config

	ioStreams *genericclioptions.IOStreams
}

func NewCommand(globalOptions *cmd.GlobalOptions) *cobra.Command {
	opt := &ListNodesOptions{}

	cmd := &cobra.Command{
		Use:   "list-nodes",
		Short: "Test list all Kubernetes nodes",
		RunE: func(cmd *cobra.Command, args []string) error {
			cmd.SilenceUsage = true

			if err := opt.Complete(cmd, args, globalOptions); err != nil {
				return err
			}

			return run(cmd.Context(), opt)
		},
	}

	return cmd
}

// Set all information required
func (opt *ListNodesOptions) Complete(
	cmd *cobra.Command, args []string, globalOptions *cmd.GlobalOptions,
) error {
	opt.ioStreams = globalOptions.GetIOStreams()

	var err error
	opt.config, err = globalOptions.GetConfigFlags().ToRESTConfig()
	if err != nil {
		return err
	}

	return nil
}

// Run the command
func run(ctx context.Context, opt *ListNodesOptions) error {
	client, err := kubernetes.NewForConfig(opt.config)
	if err != nil {
		return err
	}

	nodes, err := client.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
	if err != nil {
		return err
	}

	fmt.Fprintf(opt.ioStreams.Out, "List of all nodes:\n")
	for _, n := range nodes.Items {
		fmt.Fprintf(opt.ioStreams.Out, "\t%s\n", n.Name)
	}

	return nil
}
