package cmd

import (
	"flag"
	"fmt"
	"os"

	"github.com/spf13/cobra"

	"k8s.io/cli-runtime/pkg/genericclioptions"
)

type GlobalOptions struct {
	configFlags *genericclioptions.ConfigFlags

	genericclioptions.IOStreams
}

func NewGlobalOptions(streams genericclioptions.IOStreams) *GlobalOptions {
	return &GlobalOptions{
		configFlags: genericclioptions.NewConfigFlags(true),

		IOStreams: streams,
	}
}

// rootCmd represents the base command when called without any subcommands
var rootCmd = &cobra.Command{
	Use:   "metalk8s",
	Short: "Manage MetalK8s objects.",
	PersistentPreRun: func(cmd *cobra.Command, args []string) {
		// For cobra + klog flags, Available to all subcommands.
		flag.Parse()
	},
}

var globalOptions *GlobalOptions

func init() {
	streams := genericclioptions.IOStreams{
		In: os.Stdin, Out: os.Stdout, ErrOut: os.Stderr,
	}
	globalOptions = NewGlobalOptions(streams)

	globalOptions.configFlags.AddFlags(rootCmd.PersistentFlags())
}

// Execute adds all child commands to the root command and sets flags appropriately.
// This is called by main.main(). It only needs to happen once to the rootCmd.
func Execute() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}
