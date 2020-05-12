package main

import (
	"context"
	"flag"
	"fmt"
	"os"

	"github.com/scality/metalk8s/kubectl-metalk8s/pkg/cmd"
	"github.com/scality/metalk8s/kubectl-metalk8s/pkg/cmd/listnodes"
	"github.com/scality/metalk8s/kubectl-metalk8s/pkg/cmd/testping"

	"k8s.io/cli-runtime/pkg/genericclioptions"
	"k8s.io/klog"
)

func main() {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	streams := &genericclioptions.IOStreams{
		In:     os.Stdin,
		Out:    os.Stdout,
		ErrOut: os.Stderr,
	}

	globalOptions := cmd.NewGlobalOptions(streams)

	rootCmd := cmd.NewRootCommand()
	rootCmd.AddCommand(listnodes.NewCommand(globalOptions))
	rootCmd.AddCommand(testping.NewCommand(globalOptions))

	klogFlags := &flag.FlagSet{}
	klog.InitFlags(klogFlags)
	rootCmd.PersistentFlags().AddGoFlagSet(klogFlags)

	globalOptions.AddFlags(rootCmd.PersistentFlags())

	if err := rootCmd.ExecuteContext(ctx); err != nil {
		fmt.Fprintf(streams.ErrOut, "Error: %v\n", err)
		os.Exit(1)
	}
}
