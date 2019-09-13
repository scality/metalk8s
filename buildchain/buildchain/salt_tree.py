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
from typing import Any, Iterator, Tuple, Union

from buildchain import config
from buildchain import constants
from buildchain import targets
from buildchain import types
from buildchain import utils
from buildchain import versions
from buildchain.targets.serialize import Renderer

sys.path.append(str(constants.STATIC_CONTAINER_REGISTRY))
container_registry : Any = importlib.import_module('static-container-registry')


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

VOLUME_CRD : Path = OPERATOR_YAML_ROOT/'crds/storage_v1alpha1_volume_crd.yaml'

OPERATOR_ACCOUNT     : Path = OPERATOR_YAML_ROOT/'service_account.yaml'
OPERATOR_ROLE        : Path = OPERATOR_YAML_ROOT/'role.yaml'
OPERATOR_ROLEBINDING : Path = OPERATOR_YAML_ROOT/'role_binding.yaml'
OPERATOR_DEPLOYMENT  : Path = OPERATOR_YAML_ROOT/'operator.yaml'

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
                pkg.name: {'version': pkg.full_version}
                for pkg in versions.RPM_PACKAGES
            },
            'images': {
                img.name: {'version': img.version}
                for img in versions.CONTAINER_IMAGES
            },
            'metalk8s': {'version': versions.VERSION},
        },
        renderer=Renderer.JSON,
    ),

    Path('salt/metalk8s/addons/prometheus-operator/deployed/chart.sls'),
    Path('salt/metalk8s/addons/prometheus-operator/deployed/init.sls'),
    Path('salt/metalk8s/addons/prometheus-operator/deployed/namespace.sls'),
    Path('salt/metalk8s/addons/prometheus-operator/deployed/'
            'prometheus-nodeport.sls'),
    Path('salt/metalk8s/addons/prometheus-operator/deployed/storageclass.sls'),

    Path('salt/metalk8s/addons/ui/deployed.sls'),
    Path('salt/metalk8s/addons/ui/files/metalk8s-ui-deployment.yaml'),
    Path('salt/metalk8s/addons/ui/precheck.sls'),

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

    Path('salt/metalk8s/addons/nginx-ingress/deployed/init.sls'),
    Path('salt/metalk8s/addons/nginx-ingress/deployed/chart.sls'),
    Path('salt/metalk8s/addons/nginx-ingress/deployed/namespace.sls'),

    Path('salt/metalk8s/container-engine/containerd/configured.sls'),
    Path('salt/metalk8s/container-engine/containerd/init.sls'),
    Path('salt/metalk8s/container-engine/containerd/installed.sls'),
    Path('salt/metalk8s/container-engine/init.sls'),

    Path('salt/metalk8s/defaults.yaml'),
    Path('salt/metalk8s/deployed.sls'),

    Path('salt/metalk8s/internal/init.sls'),

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
    Path('salt/metalk8s/kubernetes/apiserver/files/htpasswd'),
    Path('salt/metalk8s/kubernetes/apiserver/init.sls'),
    Path('salt/metalk8s/kubernetes/apiserver/installed.sls'),
    Path('salt/metalk8s/kubernetes/apiserver/cryptconfig.sls'),
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
    Path('salt/metalk8s/kubernetes/ca/kubernetes/exported.sls'),
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

    Path('salt/metalk8s/orchestrate/bootstrap/init.sls'),
    Path('salt/metalk8s/orchestrate/bootstrap/accept-minion.sls'),
    Path('salt/metalk8s/orchestrate/deploy_node.sls'),
    Path('salt/metalk8s/orchestrate/downgrade/init.sls'),
    Path('salt/metalk8s/orchestrate/downgrade/precheck.sls'),
    Path('salt/metalk8s/orchestrate/solutions/available.sls'),
    Path('salt/metalk8s/orchestrate/solutions/init.sls'),
    Path('salt/metalk8s/orchestrate/etcd.sls'),
    Path('salt/metalk8s/orchestrate/upgrade/init.sls'),
    Path('salt/metalk8s/orchestrate/upgrade/precheck.sls'),
    Path('salt/metalk8s/orchestrate/register_etcd.sls'),

    Path('salt/metalk8s/archives/configured.sls'),
    Path('salt/metalk8s/archives/init.sls'),
    Path('salt/metalk8s/archives/mounted.sls'),

    Path('salt/metalk8s/solutions/configured.sls'),
    Path('salt/metalk8s/solutions/mounted.sls'),
    Path('salt/metalk8s/solutions/unconfigured.sls'),
    Path('salt/metalk8s/solutions/unmounted.sls'),
    Path('salt/metalk8s/solutions/init.sls'),

    Path('salt/metalk8s/repo/configured.sls'),
    Path('salt/metalk8s/repo/deployed.sls'),
    Path('salt/metalk8s/repo/files/nginx.conf.j2'),
    Path('salt/metalk8s/repo/files/metalk8s-registry-config.inc.j2'),
    Path('salt/metalk8s/repo/files/repositories-manifest.yaml.j2'),
    Path('salt/metalk8s/repo/init.sls'),
    Path('salt/metalk8s/repo/installed.sls'),
    Path('salt/metalk8s/repo/macro.sls'),
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
    Path('salt/metalk8s/salt/master/certs/salt-api.sls'),

    Path('salt/metalk8s/salt/minion/configured.sls'),
    Path('salt/metalk8s/salt/minion/files/minion-99-metalk8s.conf.j2'),
    Path('salt/metalk8s/salt/minion/init.sls'),
    Path('salt/metalk8s/salt/minion/installed.sls'),
    Path('salt/metalk8s/salt/minion/local.sls'),
    Path('salt/metalk8s/salt/minion/running.sls'),

    Path('salt/metalk8s/volumes/init.sls'),
    Path('salt/metalk8s/volumes/prepared/init.sls'),
    Path('salt/metalk8s/volumes/prepared/installed.sls'),
    Path('salt/metalk8s/volumes/provisioned/init.sls'),
    Path('salt/metalk8s/volumes/unprepared/init.sls'),

    Path('salt/_auth/kubernetes_rbac.py'),

    Path('salt/_modules/containerd.py'),
    Path('salt/_modules/cri.py'),
    Path('salt/_modules/metalk8s_cordon.py'),
    Path('salt/_modules/metalk8s_drain.py'),
    Path('salt/_modules/metalk8s_kubernetes.py'),
    Path('salt/_modules/metalk8s_etcd.py'),
    Path('salt/_modules/metalk8s_kubernetes_utils.py'),
    Path('salt/_modules/metalk8s.py'),
    Path('salt/_modules/metalk8s_network.py'),
    Path('salt/_modules/metalk8s_package_manager.py'),
    Path('salt/_modules/metalk8s_volumes.py'),
    Path('salt/_modules/metalk8s_solutions.py'),


    Path('salt/_pillar/metalk8s.py'),
    Path('salt/_pillar/metalk8s_endpoints.py'),
    Path('salt/_pillar/metalk8s_nodes.py'),
    Path('salt/_pillar/metalk8s_private.py'),
    Path('salt/_pillar/metalk8s_solutions.py'),
    Path('salt/_pillar/metalk8s_etcd.py'),

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

    Path('salt/_utils/pillar_utils.py'),
    Path('salt/_utils/volume_utils.py'),

    # This image is defined here and not in the `image` module since it is
    # saved into the `salt/` tree.
    targets.RemoteImage(
        name='pause',
        version=versions.CONTAINER_IMAGES_MAP['pause'].version,
        digest=versions.CONTAINER_IMAGES_MAP['pause'].digest,
        repository=constants.GOOGLE_REPOSITORY,
        save_as_tar=True,
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
