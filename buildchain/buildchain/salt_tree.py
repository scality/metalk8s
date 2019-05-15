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
from buildchain import types


def task_salt_tree() -> types.TaskDict:
    """Deploy the Salt tree in ISO_ROOT."""
    return {
        'actions': None,
        'task_dep': [
            '_deploy_salt_tree:*',
        ],
    }


def task__deploy_salt_tree() -> Iterator[types.TaskDict]:
    """Deploy a Salt sub-tree"""
    for file_tree in FILE_TREES:
        yield from file_tree.execution_plan


PILLAR_FILES : Tuple[Union[Path, targets.FileTarget], ...] = (
    Path('pillar/metalk8s/roles/minion.sls'),
    targets.TemplateFile(
        task_name='bootstrap.sls',
        source=constants.ROOT/'pillar'/'metalk8s'/'roles'/'bootstrap.sls.in',
        destination=
            constants.ISO_ROOT/'pillar'/'metalk8s'/'roles'/'bootstrap.sls',
        context={'VERSION': constants.SHORT_VERSION},
        file_dep=[constants.VERSION_FILE],
    ),
    Path('pillar/metalk8s/roles/ca.sls'),
    Path('pillar/metalk8s/roles/etcd.sls'),
    Path('pillar/metalk8s/roles/master.sls'),
    Path('pillar/metalk8s/roles/node.sls'),
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
    targets.TemplateFile(
        task_name='top.sls',
        source=constants.ROOT/'salt'/'top.sls.in',
        destination=constants.ISO_ROOT/'salt'/'top.sls',
        context={'VERSION': constants.SHORT_VERSION},
        file_dep=[constants.VERSION_FILE],
    ),

    Path('salt/metalk8s/addons/prometheus-operator/deployed.sls'),

    Path('salt/metalk8s/addons/ui/deployed.sls'),
    Path('salt/metalk8s/addons/ui/files/metalk8s-ui-deployment.yaml'),

    Path('salt/metalk8s/container-engine/containerd/configured.sls'),
    Path('salt/metalk8s/container-engine/containerd/init.sls'),
    Path('salt/metalk8s/container-engine/containerd/installed.sls'),

    Path('salt/metalk8s/defaults.yaml'),

    Path('salt/metalk8s/internal/init.sls'),

    Path('salt/metalk8s/internal/m2crypto/absent.sls'),
    Path('salt/metalk8s/internal/m2crypto/init.sls'),
    Path('salt/metalk8s/internal/m2crypto/installed.sls'),

    Path('salt/metalk8s/internal/preflight/init.sls'),
    Path('salt/metalk8s/internal/preflight/mandatory.sls'),
    Path('salt/metalk8s/internal/preflight/recommended.sls'),

    Path('salt/metalk8s/kubectl/init.sls'),
    Path('salt/metalk8s/kubectl/installed.sls'),

    Path('salt/metalk8s/kubernetes/apiserver/certs/etcd-client.sls'),
    Path('salt/metalk8s/kubernetes/apiserver/certs/front-proxy-client.sls'),
    Path('salt/metalk8s/kubernetes/apiserver/certs/init.sls'),
    Path('salt/metalk8s/kubernetes/apiserver/certs/kubelet-client.sls'),
    Path('salt/metalk8s/kubernetes/apiserver/certs/server.sls'),
    Path('salt/metalk8s/kubernetes/apiserver/files/htpasswd'),
    Path('salt/metalk8s/kubernetes/apiserver/init.sls'),
    Path('salt/metalk8s/kubernetes/apiserver/installed.sls'),
    Path('salt/metalk8s/kubernetes/apiserver/kubeconfig.sls'),

    Path('salt/metalk8s/kubernetes/ca/advertised.sls'),
    Path('salt/metalk8s/kubernetes/ca/etcd/advertised.sls'),
    Path('salt/metalk8s/kubernetes/ca/etcd/init.sls'),
    Path('salt/metalk8s/kubernetes/ca/etcd/installed.sls'),
    Path('salt/metalk8s/kubernetes/ca/front-proxy/advertised.sls'),
    Path('salt/metalk8s/kubernetes/ca/front-proxy/init.sls'),
    Path('salt/metalk8s/kubernetes/ca/front-proxy/installed.sls'),
    Path('salt/metalk8s/kubernetes/ca/init.sls'),
    Path('salt/metalk8s/kubernetes/ca/kubernetes/advertised.sls'),
    Path('salt/metalk8s/kubernetes/ca/kubernetes/init.sls'),
    Path('salt/metalk8s/kubernetes/ca/kubernetes/installed.sls'),

    Path('salt/metalk8s/kubernetes/cni/calico/configured.sls'),
    Path('salt/metalk8s/kubernetes/cni/calico/deployed.sls'),
    Path('salt/metalk8s/kubernetes/cni/calico/init.sls'),
    Path('salt/metalk8s/kubernetes/cni/calico/installed.sls'),
    Path('salt/metalk8s/kubernetes/cni/calico/upgraded.sls'),
    Path('salt/metalk8s/kubernetes/cni/loopback/configured.sls'),
    Path('salt/metalk8s/kubernetes/cni/loopback/init.sls'),
    Path('salt/metalk8s/kubernetes/cni/loopback/installed.sls'),


    Path('salt/metalk8s/kubernetes/controller-manager/init.sls'),
    Path('salt/metalk8s/kubernetes/controller-manager/installed.sls'),
    Path('salt/metalk8s/kubernetes/controller-manager/kubeconfig.sls'),

    Path('salt/metalk8s/kubernetes/coredns/deployed.sls'),
    Path('salt/metalk8s/kubernetes/coredns/files/coredns-deployment.yaml.j2'),

    Path('salt/metalk8s/kubernetes/files/control-plane-manifest.yaml'),

    Path('salt/metalk8s/kubernetes/etcd/certs/healthcheck-client.sls'),
    Path('salt/metalk8s/kubernetes/etcd/certs/init.sls'),
    Path('salt/metalk8s/kubernetes/etcd/certs/peer.sls'),
    Path('salt/metalk8s/kubernetes/etcd/certs/server.sls'),
    Path('salt/metalk8s/kubernetes/etcd/files/manifest.yaml'),
    Path('salt/metalk8s/kubernetes/etcd/healthy.sls'),
    Path('salt/metalk8s/kubernetes/etcd/init.sls'),
    Path('salt/metalk8s/kubernetes/etcd/installed.sls'),

    Path('salt/metalk8s/kubernetes/kubelet/configured.sls'),
    Path('salt/metalk8s/kubernetes/kubelet/files/kubeadm.env'),
    # pylint:disable=line-too-long
    Path('salt/metalk8s/kubernetes/kubelet/files/service-standalone-systemd.conf'),
    Path('salt/metalk8s/kubernetes/kubelet/files/service-systemd.conf'),
    Path('salt/metalk8s/kubernetes/kubelet/init.sls'),
    Path('salt/metalk8s/kubernetes/kubelet/installed.sls'),
    Path('salt/metalk8s/kubernetes/kubelet/running.sls'),
    Path('salt/metalk8s/kubernetes/kubelet/standalone.sls'),

    Path('salt/metalk8s/kubernetes/kube-proxy/deployed.sls'),

    targets.TemplateFile(
        task_name='configured.sls',
        source=constants.ROOT.joinpath(
            'salt', 'metalk8s', 'kubernetes', 'mark-control-plane',
            'deployed.sls.in'
        ),
        destination=constants.ISO_ROOT.joinpath(
            'salt', 'metalk8s', 'kubernetes', 'mark-control-plane',
            'deployed.sls'
        ),
        context={'VERSION': constants.SHORT_VERSION},
        file_dep=[constants.VERSION_FILE],
    ),

    Path('salt/metalk8s/kubernetes/sa/advertised.sls'),
    Path('salt/metalk8s/kubernetes/sa/init.sls'),
    Path('salt/metalk8s/kubernetes/sa/installed.sls'),

    Path('salt/metalk8s/kubernetes/scheduler/init.sls'),
    Path('salt/metalk8s/kubernetes/scheduler/installed.sls'),
    Path('salt/metalk8s/kubernetes/scheduler/kubeconfig.sls'),

    Path('salt/metalk8s/macro.sls'),
    Path('salt/metalk8s/map.jinja'),

    Path('salt/metalk8s/node/grains.sls'),

    Path('salt/metalk8s/orchestrate/bootstrap/init.sls'),
    Path('salt/metalk8s/orchestrate/bootstrap/accept-minion.sls'),
    Path('salt/metalk8s/orchestrate/deploy_node.sls'),
    Path('salt/metalk8s/orchestrate/upgrade/etcd.sls'),
    Path('salt/metalk8s/orchestrate/register_etcd.sls'),

    Path('salt/metalk8s/registry/deployed.sls'),
    Path('salt/metalk8s/registry/files/registry-manifest.yaml.j2'),
    Path('salt/metalk8s/registry/init.sls'),
    Path('salt/metalk8s/registry/installed.sls'),
    Path('salt/metalk8s/registry/macro.sls'),
    Path('salt/metalk8s/registry/populated.sls'),

    Path('salt/metalk8s/repo/configured.sls'),
    Path('salt/metalk8s/repo/deployed.sls'),
    Path('salt/metalk8s/repo/files/nginx.conf.j2'),
    Path('salt/metalk8s/repo/files/package-repositories-manifest.yaml.j2'),
    Path('salt/metalk8s/repo/init.sls'),
    Path('salt/metalk8s/repo/installed.sls'),
    Path('salt/metalk8s/repo/offline.sls'),

    Path('salt/metalk8s/roles/bootstrap/absent.sls'),
    Path('salt/metalk8s/roles/bootstrap/init.sls'),
    Path('salt/metalk8s/roles/ca/absent.sls'),
    Path('salt/metalk8s/roles/ca/init.sls'),
    Path('salt/metalk8s/roles/etcd/absent.sls'),
    Path('salt/metalk8s/roles/etcd/init.sls'),
    Path('salt/metalk8s/roles/infra/init.sls'),
    Path('salt/metalk8s/roles/infra/absent.sls'),
    Path('salt/metalk8s/roles/internal/node-without-calico.sls'),
    Path('salt/metalk8s/roles/master/absent.sls'),
    Path('salt/metalk8s/roles/master/init.sls'),
    Path('salt/metalk8s/roles/minion/init.sls'),
    Path('salt/metalk8s/roles/node/absent.sls'),
    Path('salt/metalk8s/roles/node/init.sls'),

    Path('salt/metalk8s/salt/master/configured.sls'),
    Path('salt/metalk8s/salt/master/deployed.sls'),
    Path('salt/metalk8s/salt/master/files/master-99-metalk8s.conf.j2'),
    Path('salt/metalk8s/salt/master/files/salt-master-manifest.yaml.j2'),
    Path('salt/metalk8s/salt/master/init.sls'),
    Path('salt/metalk8s/salt/master/installed.sls'),
    Path('salt/metalk8s/salt/master/certs/etcd-client.sls'),
    Path('salt/metalk8s/salt/master/certs/init.sls'),

    Path('salt/metalk8s/salt/minion/configured.sls'),
    Path('salt/metalk8s/salt/minion/files/minion-99-metalk8s.conf.j2'),
    Path('salt/metalk8s/salt/minion/init.sls'),
    Path('salt/metalk8s/salt/minion/installed.sls'),
    Path('salt/metalk8s/salt/minion/running.sls'),

    Path('salt/_auth/kubernetes_rbac.py'),

    Path('salt/_modules/containerd.py'),
    Path('salt/_modules/cri.py'),
    Path('salt/_modules/docker_registry.py'),
    Path('salt/_modules/metalk8s_cordon.py'),
    Path('salt/_modules/metalk8s_drain.py'),
    Path('salt/_modules/metalk8s_kubernetes.py'),
    Path('salt/_modules/metalk8s_etcd.py'),
    Path('salt/_modules/metalk8s_kubernetes_utils.py'),
    Path('salt/_modules/metalk8s.py'),

    Path('salt/_pillar/metalk8s.py'),
    Path('salt/_pillar/metalk8s_endpoints.py'),
    Path('salt/_pillar/metalk8s_nodes.py'),

    Path('salt/_renderers/metalk8s_kubernetes.py'),

    Path('salt/_roster/kubernetes_nodes.py'),

    Path('salt/_runners/metalk8s_saltutil.py'),

    Path('salt/_states/containerd.py'),
    Path('salt/_states/kubeconfig.py'),
    Path('salt/_states/docker_registry.py'),
    Path('salt/_states/metalk8s.py'),
    Path('salt/_states/metalk8s_cordon.py'),
    Path('salt/_states/metalk8s_drain.py'),
    Path('salt/_states/metalk8s_etcd.py'),
    Path('salt/_states/metalk8s_kubernetes.py'),

    targets.RemoteImage(
        registry=constants.GOOGLE_REGISTRY,
        name='pause',
        version='3.1',
        # pylint:disable=line-too-long
        digest='sha256:f78411e19d84a252e53bff71a4407a5686c46983a2c2eeed83929b888179acea',
        destination=constants.ISO_ROOT/'salt/metalk8s/container-engine/containerd/files',
        for_containerd=True,
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
