package cmd

import (
	"context"
	"fmt"
	"os"

	"github.com/spf13/cobra"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"

	"k8s.io/cli-runtime/pkg/genericclioptions"

	"k8s.io/klog"
)

type ListNodesOptions struct {
	config *rest.Config

	genericclioptions.IOStreams
}

// NewListNodesOptions provides an instance of ListNodesOptions with default values
func NewListNodesOptions(streams genericclioptions.IOStreams) *ListNodesOptions {
	return &ListNodesOptions{
		IOStreams: streams,
	}
}

// NewCmdListNodes provide a cobra command wrapping ListNodesOptions
func NewCmdListNodes(streams genericclioptions.IOStreams) *cobra.Command {
	opt := NewListNodesOptions(streams)

	cmd := &cobra.Command{
		Use:          "list-nodes",
		Short:        "Test list all Kubernetes nodes",
		SilenceUsage: true,
		RunE: func(cmd *cobra.Command, args []string) error {
			klog.V(5).Info("listNodes called")
			if err := opt.Complete(cmd, args); err != nil {
				return err
			}
			if err := opt.Validate(); err != nil {
				return err
			}
			if err := opt.Run(); err != nil {
				return err
			}

			return nil
		},
	}

	return cmd
}

// Set all information required
func (opt *ListNodesOptions) Complete(cmd *cobra.Command, args []string) error {
	var err error
	opt.config, err = globalOptions.configFlags.ToRESTConfig()
	if err != nil {
		return err
	}

	klog.V(5).Info("List nodes options completed")
	return nil
}

// Validate provided informations
func (opt *ListNodesOptions) Validate() error {
	klog.V(5).Info("List nodes options validated")

	return nil
}

// Run the command
func (opt *ListNodesOptions) Run() error {

	clientset, err := kubernetes.NewForConfig(opt.config)
	if err != nil {
		return err
	}

	nodes, err := clientset.CoreV1().Nodes().List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		return err
	}

	fmt.Fprintf(opt.IOStreams.Out, "List of all nodes:\n")
	for _, n := range nodes.Items {
		fmt.Fprintf(opt.IOStreams.Out, "\t%s\n", n.Name)
	}

	klog.V(5).Info("List nodes done")
	return nil
}

func init() {
	streams := genericclioptions.IOStreams{
		In: os.Stdin, Out: os.Stdout, ErrOut: os.Stderr,
	}

	rootCmd.AddCommand(NewCmdListNodes(streams))
}
