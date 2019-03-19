# coding: utf-8


"""Tasks to deploy the Salt tree on the ISO.

This module copies entire file tree from the repository into the ISO's tree.
Some file are generated on the fly (container images, template files, …).

Overview:

                  ┌──────────────┐
             ╱───>│render top.sls│
┌──────────┐╱     └──────────────┘
│  deploy  │
│  salt/*  │╲     ┌──────────────┐
└──────────┘ ╲───>│  copy files  │
                  └──────────────┘

                  ┌──────────────┐
             ╱───>│  copy files  │
┌──────────┐╱     └──────────────┘
│ deploy   │
│ pillar/* │╲     ┌──────────────┐
└──────────┘ ╲───>│pull pause.tar│
                  └──────────────┘
"""


from pathlib import Path
from typing import Iterator, Tuple, Union

from buildchain import constants
from buildchain import targets
from buildchain import utils


def task_salt_tree() -> dict:
    """Deploy the Salt tree in ISO_ROOT."""
    return {
        'actions': None,
        'task_dep': [
            '_deploy_salt_tree:*',
        ],
    }


def task__deploy_salt_tree() -> Iterator[dict]:
    """Deploy a Salt sub-tree"""
    for file_tree in FILE_TREES:
        yield from file_tree.execution_plan


PILLAR_FILES : Tuple[Union[Path, targets.FileTarget], ...] = (
    Path('pillar/repositories.sls'),
    targets.TemplateFile(
        task_name='top.sls',
        source=constants.ROOT/'pillar'/'top.sls.in',
        destination=constants.ISO_ROOT/'pillar'/'top.sls',
        context={'VERSION': constants.SHORT_VERSION},
        file_dep=[constants.VERSION_FILE],
    ),
)


# List of salt files to install.
SALT_FILES : Tuple[Union[Path, targets.FileTarget], ...] = (
    Path('salt/metalk8s/calico/configured.sls'),
    Path('salt/metalk8s/calico/deployed.sls'),
    Path('salt/metalk8s/calico/init.sls'),
    Path('salt/metalk8s/calico/installed.sls'),

    Path('salt/metalk8s/containerd/configured.sls'),
    Path('salt/metalk8s/containerd/init.sls'),
    Path('salt/metalk8s/containerd/installed.sls'),

    Path('salt/metalk8s/defaults.yaml'),

    Path('salt/metalk8s/kubeadm/init/certs/apiserver.sls'),
    Path('salt/metalk8s/kubeadm/init/certs/apiserver-etcd-client.sls'),
    Path('salt/metalk8s/kubeadm/init/certs/apiserver-kubelet-client.sls'),
    Path('salt/metalk8s/kubeadm/init/certs/ca.sls'),
    Path('salt/metalk8s/kubeadm/init/certs/etcd-ca.sls'),
    Path('salt/metalk8s/kubeadm/init/certs/etcd-healthcheck-client.sls'),
    Path('salt/metalk8s/kubeadm/init/certs/etcd-peer.sls'),
    Path('salt/metalk8s/kubeadm/init/certs/etcd-server.sls'),
    Path('salt/metalk8s/kubeadm/init/certs/front-proxy-ca.sls'),
    Path('salt/metalk8s/kubeadm/init/certs/front-proxy-client.sls'),
    Path('salt/metalk8s/kubeadm/init/certs/init.sls'),
    Path('salt/metalk8s/kubeadm/init/certs/installed.sls'),
    Path('salt/metalk8s/kubeadm/init/certs/sa.sls'),

    Path('salt/metalk8s/kubeadm/init/control-plane/apiserver.sls'),
    Path('salt/metalk8s/kubeadm/init/control-plane/controller-manager.sls'),
    Path('salt/metalk8s/kubeadm/init/control-plane/files/manifest.yaml'),
    Path('salt/metalk8s/kubeadm/init/control-plane/init.sls'),
    Path('salt/metalk8s/kubeadm/init/control-plane/lib.sls'),
    Path('salt/metalk8s/kubeadm/init/control-plane/scheduler.sls'),

    Path('salt/metalk8s/kubeadm/init/etcd/init.sls'),
    Path('salt/metalk8s/kubeadm/init/etcd/files/manifest.yaml'),
    Path('salt/metalk8s/kubeadm/init/etcd/local.sls'),

    Path('salt/metalk8s/kubeadm/init/init.sls'),

    Path('salt/metalk8s/kubeadm/init/kubelet-start/configured.sls'),
    Path('salt/metalk8s/kubeadm/init/kubelet-start/files/kubeadm.env'),
    # pylint:disable=line-too-long
    Path('salt/metalk8s/kubeadm/init/kubelet-start/files/service-kubelet-systemd.conf'),
    Path('salt/metalk8s/kubeadm/init/kubelet-start/init.sls'),

    Path('salt/metalk8s/kubeadm/init/preflight/init.sls'),
    Path('salt/metalk8s/kubeadm/init/preflight/mandatory.sls'),
    Path('salt/metalk8s/kubeadm/init/preflight/recommended.sls'),

    Path('salt/metalk8s/kubeadm/init/kubeconfig/admin.sls'),
    Path('salt/metalk8s/kubeadm/init/kubeconfig/controller-manager.sls'),
    Path('salt/metalk8s/kubeadm/init/kubeconfig/files/service-kubelet-systemd.conf'),
    Path('salt/metalk8s/kubeadm/init/kubeconfig/init.sls'),
    Path('salt/metalk8s/kubeadm/init/kubeconfig/kubelet.sls'),
    Path('salt/metalk8s/kubeadm/init/kubeconfig/lib.sls'),
    Path('salt/metalk8s/kubeadm/init/kubeconfig/scheduler.sls'),

    Path('salt/metalk8s/kubeadm/init/mark-control-plane/init.sls'),
    Path('salt/metalk8s/kubeadm/init/mark-control-plane/configured.sls'),

    Path('salt/metalk8s/kubeadm/init/addons/init.sls'),
    Path('salt/metalk8s/kubeadm/init/addons/kube-proxy.sls'),
    Path('salt/metalk8s/kubeadm/init/addons/coredns.sls'),
    Path('salt/metalk8s/kubeadm/init/addons/files/coredns_deployment.yaml'),

    Path('salt/metalk8s/kubelet/init.sls'),
    Path('salt/metalk8s/kubelet/installed.sls'),

    Path('salt/metalk8s/macro.sls'),
    Path('salt/metalk8s/map.jinja'),

    Path('salt/metalk8s/python-kubernetes/init.sls'),
    Path('salt/metalk8s/python-kubernetes/installed.sls'),
    Path('salt/metalk8s/python-kubernetes/removed.sls'),

    Path('salt/metalk8s/repo/configured.sls'),
    Path('salt/metalk8s/repo/deployed.sls'),
    Path('salt/metalk8s/repo/files/nginx.conf.j2'),
    Path('salt/metalk8s/repo/files/package-repositories-pod.yaml.j2'),
    Path('salt/metalk8s/repo/init.sls'),
    Path('salt/metalk8s/repo/offline.sls'),
    Path('salt/metalk8s/repo/online.sls'),

    Path('salt/metalk8s/runc/init.sls'),
    Path('salt/metalk8s/runc/installed.sls'),

    Path('salt/metalk8s/registry/init.sls'),
    Path('salt/metalk8s/registry/populated.sls'),
    Path('salt/metalk8s/registry/files/registry-pod.yaml.j2'),

    Path('salt/metalk8s/salt/master/files/master_99-metalk8s.conf.j2'),
    Path('salt/metalk8s/salt/master/files/salt-master-pod.yaml.j2'),
    Path('salt/metalk8s/salt/master/configured.sls'),
    Path('salt/metalk8s/salt/master/deployed.sls'),
    Path('salt/metalk8s/salt/master/init.sls'),

    Path('salt/metalk8s/salt/minion/files/minion_99-metalk8s.conf.j2'),
    Path('salt/metalk8s/salt/minion/configured.sls'),
    Path('salt/metalk8s/salt/minion/installed.sls'),
    Path('salt/metalk8s/salt/minion/running.sls'),
    Path('salt/metalk8s/salt/minion/init.sls'),

    Path('salt/_modules/containerd.py'),
    Path('salt/_modules/cri.py'),
    Path('salt/_modules/docker_registry.py'),
    Path('salt/_modules/kubernetes.py'),

    Path('salt/_pillar/metalk8s.py'),

    Path('salt/_states/containerd.py'),
    Path('salt/_states/kubeconfig.py'),
    Path('salt/_states/docker_registry.py'),
    Path('salt/_states/kubernetes.py'),

    targets.RemoteImage(
        registry=constants.GOOGLE_REGISTRY,
        name='pause',
        version='3.1',
        # pylint:disable=line-too-long
        digest='sha256:f78411e19d84a252e53bff71a4407a5686c46983a2c2eeed83929b888179acea',
        is_compressed=False,
        destination=constants.ISO_ROOT/'salt/metalk8s/containerd/files',
    ),
)


FILE_TREES : Tuple[targets.FileTree, ...] = (
    targets.FileTree(
        basename='_deploy_salt_tree',
        files=PILLAR_FILES,
        destination_directory=constants.ISO_ROOT,
        task_dep=['_iso_mkdir_root']
    ),
    targets.FileTree(
        basename='_deploy_salt_tree',
        files=SALT_FILES,
        destination_directory=constants.ISO_ROOT,
        task_dep=['_iso_mkdir_root']
    )
)


__all__ = utils.export_only_tasks(__name__)
