FROM centos:7

ARG K8S_VERSION

RUN printf "[kubernetes]\n\
name=Kubernetes\n\
baseurl=https://packages.cloud.google.com/yum/repos/kubernetes-el7-x86_64\n\
enabled=1\n\
gpgcheck=1\n\
gpgkey=https://packages.cloud.google.com/yum/doc/yum-key.gpg\n\
       https://packages.cloud.google.com/yum/doc/rpm-package-key.gpg\n" \
    > /etc/yum.repos.d/kubernetes.repo \
    && yum install -y "kubeadm-${K8S_VERSION}" --disableexcludes=kubernetes \
    && yum clean all

RUN kubeadm init phase control-plane all \
    && kubeadm init phase etcd local

CMD echo -e "\e[32m#### Apiserver manifest ####\e[39m" \
    && cat /etc/kubernetes/manifests/kube-apiserver.yaml \
    && echo -e "\e[32m#### Controller manager manifest ####\e[39m" \
    && cat /etc/kubernetes/manifests/kube-controller-manager.yaml \
    && echo -e "\e[32m#### Scheduler manifest ####\e[39m" \
    && cat /etc/kubernetes/manifests/kube-scheduler.yaml \
    && echo -e "\e[32m#### Etcd manifest ####\e[39m" \
    && cat /etc/kubernetes/manifests/etcd.yaml
