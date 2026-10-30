from kubernetes.dynamic.exceptions import NotFoundError
from pytest_bdd import scenario, given, when, then

VERSION_APPLIED_ANNOTATION = "metalk8s.scality.com/version-applied"

IMAGE_CACHE_API = "image-cache.scality.com/v1alpha1"
OLD_IMAGE_CACHE = "worker-0-0-1"
FOREIGN_IMAGE_CACHE = "my-images-0-0-1"


# Scenarios
@scenario("../features/upgrade.feature", "Upgrade to the installed version")
def test_upgrade(host):
    pass


# Given
@given("every node completed the installed version")
def check_nodes_version_applied(k8s_client, version):
    nodes = k8s_client.resources.get(api_version="v1", kind="Node").get()
    not_applied = {
        node.metadata.name: (node.metadata.annotations or {}).get(
            VERSION_APPLIED_ANNOTATION
        )
        for node in nodes.items
        if (node.metadata.annotations or {}).get(VERSION_APPLIED_ANNOTATION) != version
    }
    assert not not_applied, f"Nodes that did not complete {version}: {not_applied}"


@given("an ImageCache of another MetalK8s version")
def old_image_cache(request, k8s_client):
    _create_image_cache(
        request,
        k8s_client,
        OLD_IMAGE_CACHE,
        {
            "app.kubernetes.io/part-of": "metalk8s",
            "metalk8s.scality.com/version": "0.0.1",
        },
    )


@given("an ImageCache that is not part of MetalK8s")
def foreign_image_cache(request, k8s_client):
    _create_image_cache(
        request,
        k8s_client,
        FOREIGN_IMAGE_CACHE,
        {"metalk8s.scality.com/version": "0.0.1"},
    )


def _create_image_cache(request, k8s_client, name, labels):
    """Create an ImageCache, deleted after the test if still there.

    It selects no node, so the agent pulls nothing for it.
    """
    image_caches = k8s_client.resources.get(
        api_version=IMAGE_CACHE_API, kind="ImageCache"
    )
    image_caches.create(
        body={
            "apiVersion": IMAGE_CACHE_API,
            "kind": "ImageCache",
            "metadata": {"name": name, "labels": labels},
            "spec": {
                "nodeSelector": {"metalk8s.scality.com/no-such-label": "true"},
                "source": "localhost/no-such-image:0.0.1",
            },
        }
    )
    request.addfinalizer(lambda: _delete_image_cache(image_caches, name))


def _delete_image_cache(image_caches, name):
    try:
        image_caches.delete(name=name)
    except NotFoundError:
        pass


def _image_cache_exists(k8s_client, name):
    image_caches = k8s_client.resources.get(
        api_version=IMAGE_CACHE_API, kind="ImageCache"
    )
    try:
        image_caches.get(name=name)
    except NotFoundError:
        return False
    return True


# When
@when("we run the upgrade to the installed version")
def run_upgrade(request, host):
    iso_root = request.config.getoption("--iso-root")
    cmd = str(iso_root / "upgrade.sh")
    with host.sudo():
        res = host.run(cmd)
        assert res.rc == 0, res.stdout


# Then
@then("no node is unschedulable")
def check_nodes_schedulable(k8s_client):
    nodes = k8s_client.resources.get(api_version="v1", kind="Node").get()
    unschedulable = [
        node.metadata.name for node in nodes.items if node.spec.unschedulable
    ]
    assert not unschedulable, f"Nodes left unschedulable: {unschedulable}"


@then("the ImageCache of another MetalK8s version is gone")
def check_old_image_cache_deleted(k8s_client):
    assert not _image_cache_exists(k8s_client, OLD_IMAGE_CACHE)


@then("the ImageCache that is not part of MetalK8s remains")
def check_foreign_image_cache_kept(k8s_client):
    assert _image_cache_exists(k8s_client, FOREIGN_IMAGE_CACHE)
