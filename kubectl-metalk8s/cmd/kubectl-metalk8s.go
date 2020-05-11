package main

import (
	"flag"
	"github.com/spf13/pflag"

	"github.com/scality/metalk8s/kubectl-metalk8s/pkg/cmd"

	"k8s.io/klog"
)

func main() {
	flags := pflag.NewFlagSet("kubectl-metalk8s", pflag.ExitOnError)
	pflag.CommandLine = flags

	klog.InitFlags(nil)

	pflag.CommandLine.AddGoFlagSet(flag.CommandLine)

	cmd.Execute()
}
