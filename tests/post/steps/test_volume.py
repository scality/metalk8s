import json
import os.path
import re

import kubernetes as k8s
from kubernetes.client.rest import ApiException
import pytest
from pytest_bdd import given, when, scenario, then, parsers
import yaml

from tests import utils
from tests import kube_utils

# Fixture {{{


@pytest.fixture
def teardown(pod_client, pvc_client, volume_client, sc_client):
    yield
    pod_client.delete_all(sync=True)
    pvc_client.delete_all(sync=True)
    volume_client.delete_all(sync=True, prefix="test-")
    sc_client.delete_all(sync=True, prefix="test-")


@pytest.fixture(scope="function")
def context():
    return {}


# }}}
# Scenarios {{{


@scenario("../features/volume.feature", "Our StorageClass is deployed")
def test_deploy_storage_class(host):
    pass


@scenario("../features/volume.feature", "The storage operator is up")
def test_deploy_operator(host):
    pass


@scenario("../features/volume.feature", "Test volume creation (sparseLoopDevice)")
def test_volume_creation_loop(host, teardown):
    pass


@scenario("../features/volume.feature", "Test volume creation (rawBlockDevice)")
def test_volume_creation_rawblock(host, teardown):
    pass


@scenario("../features/volume.feature", "Test volume creation (lvmLogicalVolume)")
def test_volume_creation_lvmlv(host, teardown):
    pass


@scenario("../features/volume.feature", "Test PersistentVolume protection")
def test_pv_protection(host, teardown):
    pass


@scenario("../features/volume.feature", "Create a volume with no volume type")
def test_no_volume_type(host, teardown):
    pass


@scenario("../features/volume.feature", "Create a volume with an invalid volume type")
def test_invalid_volume_type(host, teardown):
    pass


@scenario("../features/volume.feature", "Test in-use protection")
def test_in_use_protection(host, teardown):
    pass


@scenario("../features/volume.feature", "Volume usage (data persistency)")
def test_volume_data_persistency(host, teardown):
    pass


@scenario("../features/volume.feature", "Create a volume with unsupported FS type")
def test_volume_invalid_fs_type(host, teardown):
    pass


@scenario(
    "../features/volume.feature", "Create a volume using a non-existing StorageClass"
)
def test_volume_invalid_storage_class(host, teardown):
    pass


@scenario("../features/volume.feature", "Delete a Volume with missing StorageClass")
def test_volume_invalid_storage_class(host, teardown):
    pass


@scenario("../features/volume.feature", "Test deletion while creation is in progress")
def test_volume_delete_while_pending(host, teardown):
    pass


@scenario(
    "../features/volume.feature", "Test volume creation (sparseLoopDevice Block mode)"
)
def test_volume_creation_loop_block(host, teardown):
    pass


@scenario(
    "../features/volume.feature", "Test volume creation (rawBlockDevice Block mode)"
)
def test_volume_creation_rawblock_block(host, teardown):
    pass


@scenario(
    "../features/volume.feature", "Test volume creation (lvmLogicalVolume Block mode)"
)
def test_volume_creation_lvmlv_block(host, teardown):
    pass


# }}}
# Given {{{


@given("a device exists")
def device_exists(context, host):
    context["device_size"] = "20Gi"

    with host.sudo():
        cmd_ret = host.check_output("salt-call --out json --local temp.file")

    sparse_file = json.loads(cmd_ret)["local"]

    with host.sudo():
        host.check_output(
            "salt-call --local file.truncate {} {}".format(
                sparse_file, _quantity_to_bytes(context["device_size"])
            )
        )
        cmd_ret = host.check_output("losetup -fP --show {}".format(sparse_file))

    context["device_path"] = cmd_ret
    context["device_name"] = os.path.basename(context["device_path"])

    yield

    with host.sudo():
        host.check_output("losetup -d '{}'".format(context["device_path"]))
        host.check_output("rm -f '{}'".format(sparse_file))


@given(parsers.parse("a LVM VG '{name}' exists"))
def lvm_vg_exists(context, device_exists, host, name):
    device_path = context["device_path"]

    with host.sudo():
        host.check_output("pvcreate -y '{}'".format(device_path))
        host.check_output("vgcreate -y '{}' '{}'".format(name, device_path))

    yield

    with host.sudo():
        host.check_output("vgremove -y '{}'".format(name))
        host.check_output("pvremove -y '{}'".format(device_path))


@given(parsers.parse("a Volume '{name}' exist"))
def volume_exist(context, name, volume_client):
    if volume_client.get(name) is None:
        volume_client.create_from_yaml(kube_utils.DEFAULT_VOLUME.format(name=name))
        volume = volume_client.wait_for_status(name, "Available")
        context[name] = volume


@given(parsers.parse("a PersistentVolumeClaim exists for '{volume_name}'"))
def create_pvc_for_volume(volume_name, pvc_client, pv_client):
    if pvc_client.get("{}-pvc".format(volume_name)) is None:
        pvc_client.create_for_volume(volume_name, pv_client.get(volume_name))


@given(
    parsers.parse("a Pod using volume '{volume_name}' and running '{command}' exist")
)
def pod_exists_for_volume(volume_name, command, pod_client):
    if pod_client.get("{}-pod".format(volume_name)) is None:
        pod_client.create_with_volume(volume_name, command)


@given(parsers.parse("the StorageClass '{name}' does not exist"))
def storage_class_does_not_exist(name, sc_client):
    sc = sc_client.get(name)
    if sc is not None:
        sc_client.delete(sc.metadata.name)


@given(parsers.parse("a StorageClass '{name}' exist"))
def storage_class_exist(name, sc_client):
    if sc_client.get(name) is None:
        sc_client.create_from_yaml(kube_utils.DEFAULT_SC.format(name=name))


# }}}
# When {{{


@when(parsers.parse("I create the following Volume:\n{body}"))
def create_volume(context, body, volume_client):
    volume_client.create_from_yaml(body.format(**context))


@when(parsers.parse("I delete the Volume '{name}'"))
def delete_volume(name, volume_client):
    volume_client.delete(name, sync=False)


@when(parsers.parse("I delete the PersistentVolume '{name}'"))
def delete_pv(name, pv_client):
    pv_client.delete(name)


@when(parsers.parse("I delete the Pod using '{volume_name}'"))
def delete_pod(volume_name, pod_client):
    pod_client.delete("{}-pod".format(volume_name), sync=True)


@when(parsers.parse("I delete the PersistentVolumeClaim on '{volume_name}'"))
def delete_pv_claim(volume_name, pvc_client):
    pvc_client.delete("{}-pvc".format(volume_name), sync=True)


@when(
    parsers.parse("I create a Pod using volume '{volume_name}' and running '{command}'")
)
def create_pod_for_volume(volume_name, command, pod_client):
    pod_client.create_with_volume(volume_name, command)


@when(parsers.parse("I create the following StorageClass:\n{body}"))
def create_storage_class(body, sc_client):
    sc_client.create_from_yaml(body)


@when(parsers.parse("I delete the StorageClass '{name}'"))
def delete_storage_class(name, sc_client):
    sc_client.delete(name, sync=False)


# }}}
# Then {{{


@then(parsers.parse("we have a StorageClass '{name}'"))
def check_storage_class(name, sc_client):
    assert sc_client.get(name) is not None, "StorageClass {} not found".format(name)


@then(parsers.parse("the Volume '{name}' is '{status}'"))
def check_volume_status(context, name, status, volume_client):
    volume = volume_client.wait_for_status(name, status)
    context[name] = volume


@then(parsers.parse("the PersistentVolume '{name}' has size '{size}'"))
def check_pv_size(context, name, size, pv_client):
    # Convert size in bytes
    size_bytes = _quantity_to_bytes(size.format(**context))

    def _check_pv_size():
        pv = pv_client.get(name)
        assert pv is not None, "PersistentVolume {} not found".format(name)
        # Check size to the nearest 0.1%
        assert (
            abs(_quantity_to_bytes(pv.spec.capacity["storage"]) - size_bytes)
            < 0.1 * size_bytes / 100
        ), "Unexpected PersistentVolume size: expected {}, got {}".format(
            size, pv.spec.capacity["storage"]
        )

    utils.retry(
        _check_pv_size,
        times=10,
        wait=2,
        name="checking size of PersistentVolume {}".format(name),
    )


@then(
    parsers.parse(
        "the PersistentVolume '{name}' has label '{key}' with value '{value}'"
    )
)
def check_pv_label(name, key, value, pv_client):
    def _check_pv_label():
        pv = pv_client.get(name)
        assert pv is not None, "PersistentVolume {} not found".format(name)
        labels = pv.metadata.labels
        assert key in labels.keys(), "Label {} is missing".format(key)
        assert (
            labels[key] == value
        ), "Unexpected value for label {}: expected {}, got {}".format(
            key, value, labels[key]
        )

    utils.retry(
        _check_pv_label,
        times=10,
        wait=2,
        name="checking label of PersistentVolume {}".format(name),
    )


@then(parsers.parse("the Volume '{name}' has device name '{value}'"))
def check_device_name(context, name, value, volume_client):
    value = value.format(**context)

    def _check_device_name():
        volume = volume_client.get(name)
        assert volume is not None, "Volume {} not found".format(name)
        status = volume.get("status")
        assert status is not None, "no status for volume {}".format(name)
        deviceName = status.get("deviceName", "")
        assert (
            re.match(value, deviceName) is not None
        ), "Unexpected value for deviceName: expected {}, got {}".format(
            value, deviceName
        )

    utils.retry(
        _check_device_name,
        times=10,
        wait=2,
        name="checking deviceName of Volume {}".format(name),
    )


@then(parsers.parse("the Volume '{name}' does not exist"))
def check_volume_absent(name, volume_client):
    volume_client.wait_for_deletion(name)


@then(parsers.parse("the PersistentVolume '{name}' does not exist"))
def check_pv_absent(name, pv_client):
    pv_client.wait_for_deletion(name)


@then(parsers.parse("the PersistentVolume '{name}' is marked for deletion"))
def check_pv_deletion_marker(name, pv_client):
    pv_client.check_deletion_marker(name)


@then(
    parsers.parse(
        "the Volume '{name}' is 'Failed' "
        "with code '{code}' and message matches '{pattern}'"
    )
)
def check_volume_error(context, name, code, pattern, volume_client):
    volume = volume_client.wait_for_status(name, "Failed")
    status = volume["status"]
    errcode, errmsg = kube_utils.VolumeClient.get_error(status)
    assert errcode == code, "Unexpected error code: expected {}, got {}".format(
        code, errcode
    )
    assert (
        re.search(pattern, errmsg) is not None
    ), "Error message `{}` doesn't match `{}`".format(errmsg, pattern)
    context[name] = volume


@then(parsers.parse("the Volume '{name}' is marked for deletion"))
def check_volume_deletion_marker(name, volume_client):
    volume_client.check_deletion_marker(name)


@then(
    parsers.parse(
        "the Pod using volume '{volume_name}' "
        "has a file '{path}' containing '{content}'"
    )
)
def check_file_content_inside_pod(volume_name, path, content, k8s_client):
    name = "{}-pod".format(volume_name)

    # NOTE: We use Kubernetes client instead of DynamicClient as it
    # ease the execution of command in a Pod
    client = k8s.client.CoreV1Api(api_client=k8s_client.client)

    def _check_file_content():
        try:
            result = k8s.stream.stream(
                client.connect_get_namespaced_pod_exec,
                name=name,
                namespace="default",
                command=["cat", path],
                stderr=True,
                stdin=False,
                stdout=True,
                tty=False,
            )
        except ApiException:
            assert False
        assert (
            result.rstrip("\n") == content
        ), 'unexpected data in {}: expected "{}", got "{}"'.format(
            path, content, result
        )

    utils.retry(
        _check_file_content,
        times=10,
        wait=2,
        name="checking content of {} on Pod {}".format(path, name),
    )


@then(parsers.parse("the backing storage for Volume '{name}' is created"))
def check_storage_is_created(context, host, name):
    volume = context.get(name)
    assert volume is not None, "volume {} not found in context".format(name)
    assert (
        "sparseLoopDevice" in volume["spec"].keys()
    ), "unsupported volume type for this step"
    uuid = volume["metadata"]["uid"]
    capacity = volume["spec"]["sparseLoopDevice"]["size"]
    # Check that the sparse file exists and has the proper size.
    path = "/var/lib/metalk8s/storage/sparse/{}".format(uuid)
    size = int(host.check_output("stat -c %s {}".format(path)))
    assert _quantity_to_bytes(capacity) == size
    # Check that the loop device is mounted.
    if volume["spec"].get("mode", "Filesystem") == "Filesystem":
        host.run_test("test -b /dev/disk/by-uuid/{}".format(uuid))
    else:
        host.run_test("test -b /dev/disk/by-partuuid/{}".format(uuid))


@then(parsers.parse("the backing storage for Volume '{name}' is deleted"))
def check_storage_is_deleted(context, host, name):
    volume = context.get(name)
    assert volume is not None, "volume {} not found in context".format(name)
    assert (
        "sparseLoopDevice" in volume["spec"].keys()
    ), "unsupported volume type for this step"
    uuid = volume["metadata"]["uid"]
    # Check that the sparse file is deleted.
    path = "/var/lib/metalk8s/storage/sparse/{}".format(uuid)
    host.run_test("test ! -f {}".format(path))
    # Check that the loop device is not mounted.
    host.run_test("test ! -b /dev/disk/by-uuid/{}".format(uuid))


@then(parsers.parse("the backing storage for Volume '{name}' still exists"))
def check_storage_still_exists(context, host, name):
    volume = context.get(name)
    assert volume is not None, "volume {} not found in context".format(name)
    assert set(["rawBlockDevice", "lvmLogicalVolume"]) & set(
        volume["spec"].keys()
    ), "unsupported volume type for this step"
    uuid = volume["metadata"]["uid"]
    # Check that the device is not mounted
    host.run_test("test ! -b /dev/disk/by-uuid/{}".format(uuid))
    # Check that the device still exist
    host.run_test("test -f /dev/disk/by-uuid/{}".format(uuid))


@then(parsers.parse("the device '{name}' exists"))
def check_device_exists(context, host, name):
    host.run_test("test -f {}".format(name))


# }}}
# Helpers {{{
def _quantity_to_bytes(quantity):
    """Return a quantity with a unit converted into a number of bytes.

    Examples:
    >>> quantity_to_bytes('42Gi')
    45097156608
    >>> quantity_to_bytes('100M')
    100000000
    >>> quantity_to_bytes('1024')
    1024

    Args:
        quantity (str): a quantity, composed of a count and an optional unit

    Returns:
        int: the capacity (in bytes)
    """
    UNIT_FACTOR = {
        None: 1,
        "Ki": 2**10,
        "Mi": 2**20,
        "Gi": 2**30,
        "Ti": 2**40,
        "Pi": 2**50,
        "k": 10**3,
        "M": 10**6,
        "G": 10**9,
        "T": 10**12,
        "P": 10**15,
    }
    size_regex = r"^(?P<size>[1-9][0-9]*)(?P<unit>[kKMGTP]i?)?$"
    match = re.match(size_regex, quantity)
    assert match is not None, "invalid resource.Quantity value"
    size = int(match.groupdict()["size"])
    unit = match.groupdict().get("unit")
    return size * UNIT_FACTOR[unit]


# }}}
