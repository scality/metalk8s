# coding: utf-8


"""Tasks to deploy the Salt tree on the ISO.

This module copies entire file tree from the repository into the ISO's tree.
Some file are generated on the fly (container images, template files, …).

Overview:

                  ┌─────────────────┐
             ╱───>│render templates │
┌──────────┐╱     └─────────────────┘
│ deploy   │
│ pillar/* │╲     ┌─────────────────┐
└──────────┘ ╲───>│  copy files     │
                  └─────────────────┘

                   ┌─────────────────┐
              ╱───>│render templates │
             ╱     └─────────────────┘
┌──────────┐╱      ┌─────────────────┐
│  deploy  │──────>│  copy files     │
│  salt/*  │╲      └─────────────────┘
└──────────┘ ╲     ┌─────────────────┐
              ╲───>│pull pause.tar   │
                   └─────────────────┘
"""


import abc
import importlib
from pathlib import Path
import sys
import textwrap
from typing import Any, Iterator, Tuple, Union

from buildchain import config
from buildchain import constants
from buildchain import targets
from buildchain import types
from buildchain import utils
from buildchain import versions

sys.path.append(str(constants.STATIC_CONTAINER_REGISTRY))
container_registry : Any = importlib.import_module('static-container-registry')

def task_salt_tree() -> types.TaskDict:
    """Deploy the Salt tree in ISO_ROOT."""
    return {
        'actions': None,
        'task_dep': [
            '_deploy_salt_tree',
        ],
    }


def task__deploy_salt_tree() -> Iterator[types.TaskDict]:
    """Deploy a Salt sub-tree"""
    for file_tree in FILE_TREES:
        yield from file_tree.execution_plan


class _StaticContainerRegistryBase(targets.AtomicTarget, abc.ABC):
    """Common code to interact with `static-container-registry`."""

    def __init__(
        self,
        destination: Path,
        **kwargs: Any
    ):
        """Set target destination.

        Arguments:
            destination: path to the nginx configuration file to write

        Keyword Arguments:
            They are passed to `Target` init method.
        """
        kwargs['targets'] = [destination]
        super().__init__(task_name=destination.name, **kwargs)

    @property
    def task(self) -> types.TaskDict:
        task = self.basic_task
        doc = ' '.join(self.__doc__.split()) if self.__doc__ else None
        task.update({
            'title': utils.title_with_target1('NGINX_CFG'),
            'doc': doc,
            'actions': [self._run],
        })
        return task

    def _run(self) -> None:
        """Generate the nginx configuration."""
        parts = self._get_parts()
        with Path(self.targets[0]).open('w', encoding='utf-8') as fp:
            for part in parts:
                fp.write(part)

    @abc.abstractmethod
    def _get_parts(self) -> Iterator[str]:
        """Yield all parts that should go in the generated configuration file.
        """
        raise NotImplementedError


class CommonStaticContainerRegistry(_StaticContainerRegistryBase):
    """Generate a nginx configuration to serve common static container
    registry."""

    def _get_parts(self) -> Iterator[str]:
        parts : Iterator[str] = container_registry.create_config(
                None, None, None, with_constants=True, only_constants=True,
        )
        return parts


class StaticContainerRegistry(_StaticContainerRegistryBase):
    """Generate a nginx configuration to serve a static container registry."""

    def __init__(
        self,
        root: Path,
        server_root: str,
        name_prefix: str,
        destination: Path,
        **kwargs: Any
    ):
        """Configure the static-container-registry script.

        Arguments:
            root:        path to the image files
            server_root: where the image files will be stored on the web server
            context:     will prefix every container name
            destination: path to the nginx configuration file to write

        Keyword Arguments:
            They are passed to `Target` init method.
        """
        super().__init__(destination=destination, **kwargs)
        self._img_root = root
        self._srv_root = server_root
        self._name_pfx = name_prefix

    def _get_parts(self) -> Iterator[str]:
        """Yield all parts that should go in the generated configuration file.
        """
        parts : Iterator[str] = container_registry.create_config(
            self._img_root, self._srv_root, self._name_pfx,
            with_constants=False,
        )
        return parts


PILLAR_FILES : Tuple[Union[Path, targets.AtomicTarget], ...] = (
    Path('pillar/metalk8s/roles/bootstrap.sls'),
    Path('pillar/metalk8s/roles/ca.sls'),
    Path('pillar/metalk8s/roles/etcd.sls'),
    Path('pillar/metalk8s/roles/master.sls'),
    Path('pillar/metalk8s/roles/minion.sls'),
    Path('pillar/metalk8s/roles/node.sls'),
    targets.TemplateFile(
        task_name='top.sls',
        source=constants.ROOT/'pillar'/'top.sls.in',
        destination=constants.ISO_ROOT/'pillar'/'top.sls',
        context={'VERSION': versions.VERSION},
        file_dep=[versions.VERSION_FILE],
    ),
)

OPERATOR_YAML_ROOT : Path = constants.ROOT/'storage-operator/deploy'

VOLUME_CRD : Path = OPERATOR_YAML_ROOT.joinpath(
    'crds', 'storage.metalk8s.scality.com_volumes_crd.yaml',
)

OPERATOR_ACCOUNT     : Path = OPERATOR_YAML_ROOT/'service_account.yaml'
OPERATOR_ROLE        : Path = OPERATOR_YAML_ROOT/'role.yaml'
OPERATOR_ROLEBINDING : Path = OPERATOR_YAML_ROOT/'role_binding.yaml'
OPERATOR_DEPLOYMENT  : Path = OPERATOR_YAML_ROOT/'operator.yaml'

LOKI_DASHBOARD          : Path = constants.ROOT/'charts/loki-dashboard.json'
LOGS_DASHBOARD          : Path = constants.ROOT/'charts/logs-dashboard.json'
FLUENT_BIT_DASHBOARD    : Path = constants.ROOT.joinpath(
    'charts/fluent-bit-dashboard.json'
)

SCALITY_LOGO : Path = constants.ROOT/'ui/public/brand/assets/login/logo.png'
SCALITY_FAVICON : Path = constants.ROOT.joinpath(
    'ui/public/brand/assets/login/favicon.png'
)
LOGIN_STYLE : Path = constants.ROOT/'ui/public/brand/assets/login/styles.css'

# List of salt files to install.
SALT_FILES : Tuple[Union[Path, targets.AtomicTarget], ...] = (
    targets.TemplateFile(
        task_name='top.sls',
        source=constants.ROOT/'salt'/'top.sls.in',
        destination=constants.ISO_ROOT/'salt'/'top.sls',
        context={'VERSION': versions.VERSION},
        file_dep=[versions.VERSION_FILE],
    ),

    targets.SerializedData(
        task_name='versions.json',
        destination=constants.ISO_ROOT/'salt'/'metalk8s'/'versions.json',
        data={
            'kubernetes': {'version': versions.K8S_VERSION},
            'packages': {
                'centos': {
                    pkg.name: {'version': pkg.full_version}
                    for pkg in versions.RPM_PACKAGES
                },
                'redhat': {
                    pkg.name: {'version': pkg.full_version}
                    for pkg in versions.RPM_PACKAGES
                },
                'ubuntu': {
                    pkg.name: {'version': pkg.full_version}
                    for pkg in versions.DEB_PACKAGES
                },
            },
            'images': {
                img.name: {'version': img.version}
                for img in versions.CONTAINER_IMAGES
            },
            'metalk8s': {'version': versions.VERSION},
        },
        renderer=targets.Renderer.JSON,
    ),

    Path('salt/metalk8s/addons/dex/ca/init.sls'),
    Path('salt/metalk8s/addons/dex/ca/installed.sls'),
    Path('salt/metalk8s/addons/dex/ca/advertised.sls'),
    Path('salt/metalk8s/addons/dex/certs/init.sls'),
    Path('salt/metalk8s/addons/dex/certs/server.sls'),
    Path('salt/metalk8s/addons/dex/config/dex.yaml.j2'),
    Path('salt/metalk8s/addons/dex/deployed/chart.sls'),
    Path('salt/metalk8s/addons/dex/deployed/init.sls'),
    Path('salt/metalk8s/addons/dex/deployed/namespace.sls'),
    Path('salt/metalk8s/addons/dex/deployed/secret.sls'),
    Path('salt/metalk8s/addons/dex/deployed/service-configuration.sls'),
    Path('salt/metalk8s/addons/dex/deployed/tls-secret.sls'),
    Path('salt/metalk8s/addons/dex/deployed/clusterrolebinding.sls'),
    targets.SerializedData(
        task_name='theme-configmap.sls',
        destination=constants.ISO_ROOT.joinpath(
            'salt/metalk8s/addons/dex/deployed/theme-configmap.sls'
        ),
        data=targets.SaltState(
            shebang='#!jinja | metalk8s_kubernetes',
            imports=[],
            content=[{
                'apiVersion': 'v1',
                'kind': 'ConfigMap',
                'metadata': {
                    'name': 'dex-login',
                    'namespace': 'metalk8s-auth',
                },
                'data': {
                    'styles.css': targets.YAMLDocument.text(
                        LOGIN_STYLE.read_text(encoding='utf-8')
                    ),
                },
                'binaryData': {
                    'favicon.png': targets.YAMLDocument.bytestring(
                        SCALITY_FAVICON.read_bytes()
                    ),
                    'logo.png': targets.YAMLDocument.bytestring(
                        SCALITY_LOGO.read_bytes()
                    )
                },
            }],
        ),
        file_dep=[SCALITY_LOGO, SCALITY_FAVICON, LOGIN_STYLE],
        renderer=targets.Renderer.SLS,
    ),
    Path('salt/metalk8s/addons/dex/deployed/',
         'nginx-ingress-ca-cert-configmap.sls'),

    Path('salt/metalk8s/addons/logging/deployed/init.sls'),
    targets.TemplateFile(
        task_name='logs dashboard.sls',
        source=constants.ROOT.joinpath(
            'salt/metalk8s/addons/logging/deployed/dashboard.sls.in'
        ),
        destination=constants.ISO_ROOT.joinpath(
            'salt/metalk8s/addons/logging/deployed/dashboard.sls'
        ),
        context={
            'LogsDashboard': textwrap.indent(
                LOGS_DASHBOARD.read_text(encoding='utf-8'),
                12 * ' '
            )
        },
        file_dep=[LOGS_DASHBOARD],
    ),
    Path('salt/metalk8s/addons/logging/deployed/namespace.sls'),
    Path('salt/metalk8s/addons/logging/fluent-bit/deployed/chart.sls'),
    Path('salt/metalk8s/addons/logging/fluent-bit/deployed/configmap.sls'),
    targets.TemplateFile(
        task_name='fluent-bit dashboard.sls',
        source=constants.ROOT.joinpath(
            'salt/metalk8s/addons/logging/fluent-bit/deployed/dashboard.sls.in'
        ),
        destination=constants.ISO_ROOT.joinpath(
            'salt/metalk8s/addons/logging/fluent-bit/deployed/dashboard.sls'
        ),
        context={
            'FluentBitDashboard': textwrap.indent(
                FLUENT_BIT_DASHBOARD.read_text(encoding='utf-8'),
                12 * ' '
            )
        },
        file_dep=[FLUENT_BIT_DASHBOARD],
    ),
    Path('salt/metalk8s/addons/logging/fluent-bit/deployed/init.sls'),
    Path('salt/metalk8s/addons/logging/loki/config/loki.yaml'),
    Path('salt/metalk8s/addons/logging/loki/deployed/chart.sls'),
    targets.TemplateFile(
        task_name='loki dashboard.sls',
        source=constants.ROOT.joinpath(
            'salt/metalk8s/addons/logging/loki/deployed/dashboard.sls.in'
        ),
        destination=constants.ISO_ROOT.joinpath(
            'salt/metalk8s/addons/logging/loki/deployed/dashboard.sls'
        ),
        context={
            'LokiDashboard': textwrap.indent(
                LOKI_DASHBOARD.read_text(encoding='utf-8'),
                12 * ' '
            )
        },
        file_dep=[LOKI_DASHBOARD],
    ),
    Path('salt/metalk8s/addons/logging/loki/deployed/datasource.sls'),
    Path('salt/metalk8s/addons/logging/loki/deployed/init.sls'),
    Path('salt/metalk8s/addons/logging/loki/deployed/',
         'loki-configuration-secret.sls'),
    Path('salt/metalk8s/addons/logging/loki/deployed/',
         'service-configuration.sls'),
    Path('salt/metalk8s/addons/logging/loki/deployed/services.sls'),

    Path('salt/metalk8s/addons/prometheus-adapter/deployed/chart.sls'),
    Path('salt/metalk8s/addons/prometheus-adapter/deployed/init.sls'),

    Path('salt/metalk8s/addons/prometheus-operator/post-cleanup.sls'),
    Path('salt/metalk8s/addons/prometheus-operator/post-downgrade.sls'),
    Path('salt/metalk8s/addons/prometheus-operator/post-upgrade.sls'),
    Path('salt/metalk8s/addons/prometheus-operator/config/alertmanager.yaml'),
    Path('salt/metalk8s/addons/prometheus-operator/config/grafana.yaml'),
    Path('salt/metalk8s/addons/prometheus-operator/config/prometheus.yaml'),
    Path('salt/metalk8s/addons/prometheus-operator/deployed/'
         'alertmanager-configuration-secret.sls'),
    Path('salt/metalk8s/addons/prometheus-operator/deployed/chart.sls'),
    Path('salt/metalk8s/addons/prometheus-operator/deployed/cleanup.sls'),
    Path('salt/metalk8s/addons/prometheus-operator/deployed/dashboards.sls'),
    Path('salt/metalk8s/addons/prometheus-operator/deployed/files/'
            'node-exporter-full.json'),
    Path('salt/metalk8s/addons/prometheus-operator/deployed/init.sls'),
    Path('salt/metalk8s/addons/prometheus-operator/deployed/namespace.sls'),
    Path('salt/metalk8s/addons/prometheus-operator/deployed/'
            'prometheus-rules.sls'),
    Path('salt/metalk8s/addons/prometheus-operator/deployed/',
            'service-configuration.sls'),
    Path('salt/metalk8s/addons/prometheus-operator/pre-downgrade.sls'),
    Path('salt/metalk8s/addons/prometheus-operator/pre-upgrade.sls'),

    Path('salt/metalk8s/addons/ui/deployed/dependencies.sls'),
    Path('salt/metalk8s/addons/ui/deployed/ingress.sls'),
    Path('salt/metalk8s/addons/ui/deployed/init.sls'),
    Path('salt/metalk8s/addons/ui/deployed/files/metalk8s-ui-deployment.yaml'),
    Path('salt/metalk8s/addons/ui/deployed/namespace.sls'),
    Path('salt/metalk8s/addons/ui/deployed/ui.sls'),

    Path('salt/metalk8s/addons/solutions/deployed/configmap.sls'),
    Path('salt/metalk8s/addons/solutions/deployed/init.sls'),
    Path('salt/metalk8s/addons/solutions/deployed/namespace.sls'),

    Path('salt/metalk8s/addons/storageclass/deployed.sls'),

    Path('salt/metalk8s/addons/volumes/deployed.sls'),
    targets.TemplateFile(
        task_name='storage-operator.sls',
        source=constants.ROOT.joinpath(
            'salt/metalk8s/addons/volumes/storage-operator.sls.in'
        ),
        destination=constants.ISO_ROOT.joinpath(
            'salt/metalk8s/addons/volumes/storage-operator.sls'
        ),
        context={
            'ServiceAccount': OPERATOR_ACCOUNT.read_text(encoding='utf-8'),
            'Role': OPERATOR_ROLE.read_text(encoding='utf-8'),
            'RoleBinding': OPERATOR_ROLEBINDING.read_text(encoding='utf-8'),
            'Deployment': OPERATOR_DEPLOYMENT.read_text(encoding='utf-8'),
        },
        file_dep=[OPERATOR_ACCOUNT, OPERATOR_ROLE,
                  OPERATOR_ROLEBINDING, OPERATOR_DEPLOYMENT],
    ),
    targets.TemplateFile(
        task_name='volume-crd.sls',
        source=constants.ROOT/'salt/metalk8s/addons/volumes/volume-crd.sls.in',
        destination=constants.ISO_ROOT.joinpath(
            'salt/metalk8s/addons/volumes/volume-crd.sls'
        ),
        context={
            'CustomResourceDefinition': VOLUME_CRD.read_text(encoding='utf-8')
        },
        file_dep=[VOLUME_CRD],
    ),

    Path('salt/metalk8s/addons/nginx-ingress/ca/init.sls'),
    Path('salt/metalk8s/addons/nginx-ingress/ca/installed.sls'),
    Path('salt/metalk8s/addons/nginx-ingress/ca/advertised.sls'),
    Path('salt/metalk8s/addons/nginx-ingress/certs/init.sls'),
    Path('salt/metalk8s/addons/nginx-ingress/certs/server.sls'),
    Path('salt/metalk8s/addons/nginx-ingress/deployed/init.sls'),
    Path('salt/metalk8s/addons/nginx-ingress/deployed/chart.sls'),
    Path('salt/metalk8s/addons/nginx-ingress/deployed/namespace.sls'),
    Path('salt/metalk8s/addons/nginx-ingress/deployed/tls-secret.sls'),

    Path('salt/metalk8s/addons/nginx-ingress-control-plane/certs/init.sls'),
    Path('salt/metalk8s/addons/nginx-ingress-control-plane/certs/server.sls'),
    Path('salt/metalk8s/addons/nginx-ingress-control-plane/deployed/init.sls'),
    Path('salt/metalk8s/addons/nginx-ingress-control-plane/deployed/chart.sls'),
    Path('salt/metalk8s/addons/nginx-ingress-control-plane/deployed/',
         'tls-secret.sls'),
    Path('salt/metalk8s/addons/nginx-ingress-control-plane/',
         'control-plane-ip.sls'),

    Path('salt/metalk8s/container-engine/containerd/configured.sls'),
    Path('salt/metalk8s/container-engine/containerd/files/50-metalk8s.conf.j2'),
    Path('salt/metalk8s/container-engine/containerd/init.sls'),
    Path('salt/metalk8s/container-engine/containerd/installed.sls'),
    Path('salt/metalk8s/container-engine/init.sls'),

    Path('salt/metalk8s/defaults.yaml'),
    Path('salt/metalk8s/deployed.sls'),

    Path('salt/metalk8s/internal/m2crypto/absent.sls'),
    Path('salt/metalk8s/internal/m2crypto/init.sls'),
    Path('salt/metalk8s/internal/m2crypto/installed.sls'),

    Path('salt/metalk8s/internal/preflight/init.sls'),
    Path('salt/metalk8s/internal/preflight/mandatory.sls'),
    Path('salt/metalk8s/internal/preflight/recommended.sls'),

    Path('salt/metalk8s/sreport/init.sls'),
    Path('salt/metalk8s/sreport/installed.sls'),

    Path('salt/metalk8s/kubectl/init.sls'),
    Path('salt/metalk8s/kubectl/installed.sls'),

    Path('salt/metalk8s/kubernetes/apiserver/certs/etcd-client.sls'),
    Path('salt/metalk8s/kubernetes/apiserver/certs/front-proxy-client.sls'),
    Path('salt/metalk8s/kubernetes/apiserver/certs/init.sls'),
    Path('salt/metalk8s/kubernetes/apiserver/certs/kubelet-client.sls'),
    Path('salt/metalk8s/kubernetes/apiserver/certs/server.sls'),
    Path('salt/metalk8s/kubernetes/apiserver/init.sls'),
    Path('salt/metalk8s/kubernetes/apiserver/installed.sls'),
    Path('salt/metalk8s/kubernetes/apiserver/cryptconfig.sls'),
    Path('salt/metalk8s/kubernetes/apiserver/kubeconfig.sls'),

    Path('salt/metalk8s/kubernetes/apiserver-proxy/files/'
            'apiserver-proxy.conf.j2'),
    Path('salt/metalk8s/kubernetes/apiserver-proxy/files/'
            'apiserver-proxy.yaml.j2'),
    Path('salt/metalk8s/kubernetes/apiserver-proxy/init.sls'),
    Path('salt/metalk8s/kubernetes/apiserver-proxy/installed.sls'),

    Path('salt/metalk8s/kubernetes/ca/advertised.sls'),
    Path('salt/metalk8s/kubernetes/ca/etcd/advertised.sls'),
    Path('salt/metalk8s/kubernetes/ca/etcd/init.sls'),
    Path('salt/metalk8s/kubernetes/ca/etcd/installed.sls'),
    Path('salt/metalk8s/kubernetes/ca/front-proxy/advertised.sls'),
    Path('salt/metalk8s/kubernetes/ca/front-proxy/init.sls'),
    Path('salt/metalk8s/kubernetes/ca/front-proxy/installed.sls'),
    Path('salt/metalk8s/kubernetes/ca/init.sls'),
    Path('salt/metalk8s/kubernetes/ca/kubernetes/advertised.sls'),
    Path('salt/metalk8s/kubernetes/ca/kubernetes/exported.sls'),
    Path('salt/metalk8s/kubernetes/ca/kubernetes/init.sls'),
    Path('salt/metalk8s/kubernetes/ca/kubernetes/installed.sls'),

    Path('salt/metalk8s/kubernetes/cni/calico/configured.sls'),
    Path('salt/metalk8s/kubernetes/cni/calico/deployed.sls'),
    Path('salt/metalk8s/kubernetes/cni/calico/init.sls'),
    Path('salt/metalk8s/kubernetes/cni/calico/installed.sls'),
    Path('salt/metalk8s/kubernetes/cni/calico/upgraded.sls'),

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
    Path('salt/metalk8s/kubernetes/etcd/init.sls'),
    Path('salt/metalk8s/kubernetes/etcd/installed.sls'),
    Path('salt/metalk8s/kubernetes/etcd/prepared.sls'),

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

    Path('salt/metalk8s/kubernetes/mark-control-plane/deployed.sls'),
    targets.TemplateFile(
        task_name='Bootstrap k8s node update file',
        source=constants.ROOT.joinpath(
            'salt', 'metalk8s', 'kubernetes', 'mark-control-plane',
            'files', 'bootstrap_node_update.yaml.j2.in'
        ),
        destination=constants.ISO_ROOT.joinpath(
            'salt', 'metalk8s', 'kubernetes', 'mark-control-plane',
            'files', 'bootstrap_node_update.yaml.j2'
        ),
        context={'VERSION': versions.VERSION},
        file_dep=[versions.VERSION_FILE],
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

    Path('salt/metalk8s/orchestrate/apiserver.sls'),
    Path('salt/metalk8s/orchestrate/deploy_node.sls'),
    Path('salt/metalk8s/orchestrate/etcd.sls'),
    Path('salt/metalk8s/orchestrate/register_etcd.sls'),

    Path('salt/metalk8s/orchestrate/bootstrap/init.sls'),
    Path('salt/metalk8s/orchestrate/bootstrap/accept-minion.sls'),
    Path('salt/metalk8s/orchestrate/bootstrap/pre-downgrade.sls'),
    Path('salt/metalk8s/orchestrate/bootstrap/pre-upgrade.sls'),

    Path('salt/metalk8s/orchestrate/downgrade/init.sls'),
    Path('salt/metalk8s/orchestrate/downgrade/precheck.sls'),
    Path('salt/metalk8s/orchestrate/downgrade/pre.sls'),
    Path('salt/metalk8s/orchestrate/downgrade/post.sls'),

    Path('salt/metalk8s/orchestrate/upgrade/init.sls'),
    Path('salt/metalk8s/orchestrate/upgrade/precheck.sls'),
    Path('salt/metalk8s/orchestrate/upgrade/pre.sls'),
    Path('salt/metalk8s/orchestrate/upgrade/post.sls'),

    Path('salt/metalk8s/orchestrate/solutions/import-components.sls'),
    Path('salt/metalk8s/orchestrate/solutions/prepare-environment.sls'),
    Path('salt/metalk8s/orchestrate/solutions/deploy-components.sls'),
    Path('salt/metalk8s/orchestrate/solutions/files/operator/configmap.yaml'),
    Path('salt/metalk8s/orchestrate/solutions/files/operator/deployment.yaml'),
    Path('salt/metalk8s/orchestrate/solutions/files/operator/role_binding.yaml'),
    Path('salt/metalk8s/orchestrate/solutions/files/operator/service_account.yaml'),

    Path('salt/metalk8s/archives/configured.sls'),
    Path('salt/metalk8s/archives/init.sls'),
    Path('salt/metalk8s/archives/mounted.sls'),

    Path('salt/metalk8s/service-configuration/deployed/init.sls'),

    Path('salt/metalk8s/repo/configured.sls'),
    Path('salt/metalk8s/repo/deployed.sls'),
    Path('salt/metalk8s/repo/files/apt.sources.list.j2'),
    Path('salt/metalk8s/repo/files/nginx.conf.j2'),
    Path('salt/metalk8s/repo/files/metalk8s-registry-config.inc.j2'),
    Path('salt/metalk8s/repo/files/repositories-manifest.yaml.j2'),
    Path('salt/metalk8s/repo/init.sls'),
    Path('salt/metalk8s/repo/installed.sls'),
    Path('salt/metalk8s/repo/macro.sls'),
    Path('salt/metalk8s/repo/redhat.sls'),
    Path('salt/metalk8s/repo/debian.sls'),

    Path('salt/metalk8s/roles/bootstrap/absent.sls'),
    Path('salt/metalk8s/roles/bootstrap/components.sls'),
    Path('salt/metalk8s/roles/bootstrap/init.sls'),
    Path('salt/metalk8s/roles/bootstrap/local.sls'),
    Path('salt/metalk8s/roles/ca/absent.sls'),
    Path('salt/metalk8s/roles/ca/init.sls'),
    Path('salt/metalk8s/roles/etcd/absent.sls'),
    Path('salt/metalk8s/roles/etcd/init.sls'),
    Path('salt/metalk8s/roles/infra/init.sls'),
    Path('salt/metalk8s/roles/infra/absent.sls'),
    Path('salt/metalk8s/roles/internal/early-stage-bootstrap.sls'),
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
    Path('salt/metalk8s/salt/master/kubeconfig.sls'),
    Path('salt/metalk8s/salt/master/certs/etcd-client.sls'),
    Path('salt/metalk8s/salt/master/certs/init.sls'),
    Path('salt/metalk8s/salt/master/certs/salt-api.sls'),

    Path('salt/metalk8s/salt/minion/configured.sls'),
    Path('salt/metalk8s/salt/minion/files/minion-99-metalk8s.conf.j2'),
    Path('salt/metalk8s/salt/minion/init.sls'),
    Path('salt/metalk8s/salt/minion/installed.sls'),
    Path('salt/metalk8s/salt/minion/local.sls'),
    Path('salt/metalk8s/salt/minion/running.sls'),

    Path('salt/metalk8s/solutions/available.sls'),
    Path('salt/metalk8s/solutions/init.sls'),

    Path('salt/metalk8s/utils/init.sls'),
    Path('salt/metalk8s/utils/httpd-tools/init.sls'),
    Path('salt/metalk8s/utils/httpd-tools/installed.sls'),

    Path('salt/metalk8s/volumes/init.sls'),
    Path('salt/metalk8s/volumes/prepared/init.sls'),
    Path('salt/metalk8s/volumes/prepared/installed.sls'),
    Path('salt/metalk8s/volumes/provisioned/init.sls'),
    Path('salt/metalk8s/volumes/unprepared/init.sls'),

    Path('salt/_auth/kubernetes_rbac.py'),

    Path('salt/_modules/containerd.py'),
    Path('salt/_modules/cri.py'),
    Path('salt/_modules/metalk8s.py'),
    Path('salt/_modules/metalk8s_cordon.py'),
    Path('salt/_modules/metalk8s_drain.py'),
    Path('salt/_modules/metalk8s_etcd.py'),
    Path('salt/_modules/metalk8s_grafana.py'),
    Path('salt/_modules/metalk8s_kubernetes.py'),
    Path('salt/_modules/metalk8s_kubernetes_utils.py'),
    Path('salt/_modules/metalk8s_monitoring.py'),
    Path('salt/_modules/metalk8s_network.py'),
    Path('salt/_modules/metalk8s_package_manager_yum.py'),
    Path('salt/_modules/metalk8s_package_manager_apt.py'),
    Path('salt/_modules/metalk8s_service_configuration.py'),
    Path('salt/_modules/metalk8s_solutions.py'),
    Path('salt/_modules/metalk8s_solutions_k8s.py'),
    Path('salt/_modules/metalk8s_volumes.py'),

    Path('salt/_pillar/metalk8s.py'),
    Path('salt/_pillar/metalk8s_endpoints.py'),
    Path('salt/_pillar/metalk8s_etcd.py'),
    Path('salt/_pillar/metalk8s_nodes.py'),
    Path('salt/_pillar/metalk8s_private.py'),
    Path('salt/_pillar/metalk8s_solutions.py'),

    Path('salt/_renderers/metalk8s_kubernetes.py'),

    Path('salt/_roster/kubernetes_nodes.py'),

    Path('salt/_runners/metalk8s_saltutil.py'),

    Path('salt/_states/containerd.py'),
    Path('salt/_states/kubeconfig.py'),
    Path('salt/_states/metalk8s.py'),
    Path('salt/_states/metalk8s_cordon.py'),
    Path('salt/_states/metalk8s_drain.py'),
    Path('salt/_states/metalk8s_etcd.py'),
    Path('salt/_states/metalk8s_kubernetes.py'),
    Path('salt/_states/metalk8s_package_manager.py'),
    Path('salt/_states/metalk8s_volumes.py'),

    Path('salt/_utils/metalk8s_utils.py'),
    Path('salt/_utils/kubernetes_utils.py'),
    Path('salt/_utils/pillar_utils.py'),
    Path('salt/_utils/volume_utils.py'),

    # This image is defined here and not in the `image` module since it is
    # saved into the `salt/` tree.
    targets.RemoteImage(
        name='pause',
        version=versions.CONTAINER_IMAGES_MAP['pause'].version,
        digest=versions.CONTAINER_IMAGES_MAP['pause'].digest,
        repository=constants.GOOGLE_REPOSITORY,
        save_as=[targets.SaveAsTar()],
        # pylint:disable=line-too-long
        destination=constants.ISO_ROOT/'salt/metalk8s/container-engine/containerd/files',
    ),

    CommonStaticContainerRegistry(
        destination=Path(
            constants.ISO_ROOT,
            'salt/metalk8s/repo/files',
            '{}-registry-common.inc'.format(config.PROJECT_NAME.lower())
        )
    ),
    StaticContainerRegistry(
        root=constants.ISO_IMAGE_ROOT,
        server_root='${}_{}_images'.format(
            config.PROJECT_NAME.lower(),
            versions.VERSION.replace('.', '_').replace('-', '_')
        ),
        name_prefix='{}-{}/'.format(
            config.PROJECT_NAME.lower(), versions.VERSION
        ),
        destination=Path(
            constants.ISO_ROOT,
            'salt/metalk8s/repo/files',
            '{}-registry.inc'.format(config.PROJECT_NAME.lower())
        ),
        task_dep=['images']
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
