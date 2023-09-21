FROM centos:7

ARG K8S_SHORT_VERSION

RUN printf "[kubernetes]\n\
name=Kubernetes\n\
baseurl=https://pkgs.k8s.io/core:/stable:/v${K8S_SHORT_VERSION}/rpm/\n\
enabled=1\n\
gpgcheck=1\n\
gpgkey=https://pkgs.k8s.io/core:/stable:/v${K8S_SHORT_VERSION}/rpm/repodata/repomd.xml.key\n" \
    > /etc/yum.repos.d/kubernetes.repo \
    && yum install -y kubeadm --disableexcludes=kubernetes \
    && yum clean all

RUN kubeadm init phase control-plane all \
    && kubeadm init phase etcd local \
    && kubeadm init phase kubelet-start

CMD echo -e "\e[32m#### Apiserver manifest ####\e[39m" \
    && cat /etc/kubernetes/manifests/kube-apiserver.yaml \
    && echo -e "\e[32m#### Controller manager manifest ####\e[39m" \
    && cat /etc/kubernetes/manifests/kube-controller-manager.yaml \
    && echo -e "\e[32m#### Scheduler manifest ####\e[39m" \
    && cat /etc/kubernetes/manifests/kube-scheduler.yaml \
    && echo -e "\e[32m#### Etcd manifest ####\e[39m" \
    && cat /etc/kubernetes/manifests/etcd.yaml \
    && echo -e "\e[32m#### Kubelet config file ####\e[39m" \
    && cat /var/lib/kubelet/config.yaml
