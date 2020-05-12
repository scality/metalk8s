package cmd

import (
	"context"
	"fmt"
	"os"

	"github.com/spf13/cobra"

	"github.com/scality/metalk8s/kubectl-metalk8s/pkg/salt"

	"k8s.io/client-go/rest"

	"k8s.io/cli-runtime/pkg/genericclioptions"

	"k8s.io/klog"
)

type TestPingOptions struct {
	config *rest.Config

	wait bool

	genericclioptions.IOStreams
}

// NewTestPingOptions provides an instance of TestPingOptions with default values
func NewTestPingOptions(streams genericclioptions.IOStreams) *TestPingOptions {
	return &TestPingOptions{
		wait:      true,
		IOStreams: streams,
	}
}

// NewCmdTestPing provide a cobra command wrapping TestPingOptions
func NewCmdTestPing(streams genericclioptions.IOStreams) *cobra.Command {
	opt := NewTestPingOptions(streams)

	cmd := &cobra.Command{
		Use:          "test-ping",
		Short:        "Test to ping on all Salt minions",
		SilenceUsage: true,
		RunE: func(cmd *cobra.Command, args []string) error {
			klog.V(5).Info("testPing called")
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

	cmd.Flags().BoolVar(&opt.wait, "wait", opt.wait, "If true, wait for response before returning.")

	return cmd
}

// Set all information required
func (opt *TestPingOptions) Complete(cmd *cobra.Command, args []string) error {
	var err error
	opt.config, err = globalOptions.configFlags.ToRESTConfig()
	if err != nil {
		return err
	}

	klog.V(5).Info("Test ping options completed")
	return nil
}

// Validate provided informations
func (opt *TestPingOptions) Validate() error {
	klog.V(5).Info("Test ping options validated")

	return nil
}

// Run the command
func (opt *TestPingOptions) Run() error {
	ctx := context.TODO()

	client, err := salt.NewForConfig(opt.config)
	if err != nil {
		return err
	}

	jid, err := client.LocalAsync(ctx, "*", "test.ping", nil)
	if err != nil {
		return err
	}

	if !opt.wait {
		fmt.Fprintf(opt.IOStreams.Out, "Test ping sended: JID %s\n", jid)
		return nil
	}

	for {
		result, err := client.PollJob(ctx, jid)
		if err != nil {
			return err
		}
		if result != nil {
			for minion, res := range result {
				fmt.Fprintf(opt.IOStreams.Out, "%s: %t\n", minion, res.(map[string]interface{})["return"].(bool))
			}
			break
		}
	}
	return nil
}

func init() {
	streams := genericclioptions.IOStreams{
		In: os.Stdin, Out: os.Stdout, ErrOut: os.Stderr,
	}

	rootCmd.AddCommand(NewCmdTestPing(streams))
}
