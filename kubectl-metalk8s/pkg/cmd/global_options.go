package cmd

import (
	"github.com/spf13/pflag"

	"k8s.io/cli-runtime/pkg/genericclioptions"
)

type GlobalOptions struct {
	configFlags *genericclioptions.ConfigFlags
	ioStreams   *genericclioptions.IOStreams
}

func NewGlobalOptions(streams *genericclioptions.IOStreams) *GlobalOptions {
	return &GlobalOptions{
		configFlags: genericclioptions.NewConfigFlags(true),
		ioStreams:   streams,
	}
}

func (o *GlobalOptions) AddFlags(fs *pflag.FlagSet) {
	o.configFlags.AddFlags(fs)
}

func (o *GlobalOptions) GetConfigFlags() *genericclioptions.ConfigFlags {
	return o.configFlags
}

func (o *GlobalOptions) GetIOStreams() *genericclioptions.IOStreams {
	return o.ioStreams
}
