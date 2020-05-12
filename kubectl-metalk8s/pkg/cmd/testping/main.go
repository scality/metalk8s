package testping

import (
	"context"
	"fmt"

	"github.com/spf13/cobra"

	"k8s.io/cli-runtime/pkg/genericclioptions"
	"k8s.io/client-go/rest"

	"github.com/scality/metalk8s/kubectl-metalk8s/pkg/cmd"
	"github.com/scality/metalk8s/kubectl-metalk8s/pkg/salt"
)

func NewCommand(globalOptions *cmd.GlobalOptions) *cobra.Command {
	wait := true

	cmd := &cobra.Command{
		Use:          "test-ping",
		Short:        "Test to ping on all Salt minions",
		SilenceUsage: true,
		RunE: func(cmd *cobra.Command, args []string) error {
			config, err := globalOptions.GetConfigFlags().ToRESTConfig()
			if err != nil {
				return err
			}

			return run(cmd.Context(), globalOptions.GetIOStreams(), config, wait)
		},
	}

	cmd.Flags().BoolVar(&wait, "wait", wait, "If true, wait for response before returning")

	return cmd
}

func run(ctx context.Context, streams *genericclioptions.IOStreams, config *rest.Config, wait bool) error {
	client, err := salt.NewForConfig(config)
	if err != nil {
		return err
	}

	jid, err := client.LocalAsync(ctx, "*", "test.ping", nil)
	if err != nil {
		return err
	}

	if !wait {
		fmt.Fprintf(streams.Out, "Test ping sended: JID %s\n", jid)
		return nil
	}

	for {
		result, err := client.PollJob(ctx, jid)
		if err != nil {
			return err
		}
		if result != nil {
			for minion, res := range result {
				fmt.Fprintf(streams.Out, "%s: %t\n", minion, res.(map[string]interface{})["return"].(bool))
			}
			break
		}
	}
	return nil
}
