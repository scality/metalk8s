package testping

import (
	"context"
	"fmt"

	"github.com/spf13/cobra"

	"github.com/scality/metalk8s/kubectl-metalk8s/pkg/cmd"
	"github.com/scality/metalk8s/kubectl-metalk8s/pkg/salt"

	"k8s.io/client-go/rest"

	"k8s.io/cli-runtime/pkg/genericclioptions"
)

type TestPingOptions struct {
	config *rest.Config

	wait bool

	ioStreams *genericclioptions.IOStreams
}

func NewCommand(globalOptions *cmd.GlobalOptions) *cobra.Command {
	opt := &TestPingOptions{
		wait: true,
	}

	cmd := &cobra.Command{
		Use:   "test-ping",
		Short: "Test to ping on all Salt minions",
		RunE: func(cmd *cobra.Command, args []string) error {
			cmd.SilenceUsage = true

			if err := opt.Complete(cmd, args, globalOptions); err != nil {
				return err
			}

			return run(cmd.Context(), opt)
		},
	}

	cmd.Flags().BoolVar(&opt.wait, "wait", opt.wait, "If true, wait for response before returning.")

	return cmd
}

// Set all information required
func (opt *TestPingOptions) Complete(
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
func run(ctx context.Context, opt *TestPingOptions) error {
	client, err := salt.NewFromConfig(opt.config)
	if err != nil {
		return err
	}

	jid, err := client.LocalAsync(ctx, "*", "test.ping", nil)
	if err != nil {
		return err
	}

	if !opt.wait {
		fmt.Fprintf(opt.ioStreams.Out, "Test ping sended: JID %s\n", jid)
		return nil
	}

	for {
		result, err := client.PollJob(ctx, jid)
		if err != nil {
			return err
		}
		if result != nil {
			for minion, res := range result {
				fmt.Fprintf(opt.ioStreams.Out, "%s: %t\n", minion, res.(map[string]interface{})["return"].(bool))
			}
			break
		}
	}
	return nil
}
