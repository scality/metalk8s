package main

import (
        "fmt"
        "k8s.io/kubernetes/cmd/kubeadm/app/preflight"
        "k8s.io/kubernetes/cmd/kubeadm/app/images"
        kubeadmapi "k8s.io/kubernetes/cmd/kubeadm/app/apis/kubeadm"
        kubeadmapiv1beta1 "k8s.io/kubernetes/cmd/kubeadm/app/apis/kubeadm/v1beta1"
)

func main() {
        fmt.Println("hello world")
        if err := preflight.RunInitMasterChecks(nil, nil, nil); err != nil {
                fmt.Println(err)
        }

        cfg := &kubeadmapiv1beta1.ClusterConfiguration{
                KubernetesVersion: fmt.Sprintf("v1.%d.0", 11),
        }
        foo := images.GetAllImages(cfg)
        fmt.Println(foo)

        fmt.Println("hello world")
}
