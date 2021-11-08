# Standard library
from importlib import reload
import json
import logging
import os.path
from unittest import TestCase
from unittest.mock import MagicMock, patch

# Runtime dependencies
from kubernetes.client.rest import ApiException
from salt.exceptions import CommandExecutionError
from urllib3.exceptions import HTTPError

# Test dependencies
from parameterized import parameterized
import yaml

# Runtime modules
from _modules import metalk8s_drain

# Test modules
from tests.unit.log_utils import capture_logs, check_captured_logs
from tests.unit import mixins
from tests.unit.mocks import kubernetes as mock_kubernetes
from tests.unit import utils


YAML_TESTS_FILE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "files", "test_metalk8s_drain.yaml"
)
with open(YAML_TESTS_FILE) as fd:
    YAML_TESTS_CASES = yaml.safe_load(fd)


class Metalk8sDrainTestCase(TestCase, mixins.LoaderModuleMockMixin):
    """Tests for `metalk8s_drain` execution module."""

    loader_module = metalk8s_drain

    loader_module_globals = {
        "__salt__": {
            "metalk8s_kubernetes.get_kubeconfig": MagicMock(
                return_value=("/my/kube/config", "my-context"),
            ),
        }
    }

    module_log_level = logging.DEBUG

    def test_virtual_nominal(self):
        """Nominal behaviour for `__virtual__`."""
        reload(metalk8s_drain)
        self.assertEqual(metalk8s_drain.__virtual__(), "metalk8s_kubernetes")

    @parameterized.expand(
        [
            ("missing kubernetes", "kubernetes"),
            ("missing urllib3", "urllib3.exceptions"),
        ]
    )
    def test_virtual_fail_import(self, _, package):
        """Behaviour for `__virtual__` on failed imports."""
        with utils.ForceImportErrorOn(package):
            reload(metalk8s_drain)
            self.assertTupleEqual(
                metalk8s_drain.__virtual__(),
                (False, "python kubernetes library not found"),
            )

    def test_exception_formatting(self):
        """Check that exceptions can be formatted as strings.

        FIXME: this isn't used, nor well formatted.
        """
        exc = metalk8s_drain.DrainException("something broke")
        self.assertEqual(
            str(exc),
            "<<class '_modules.metalk8s_drain.DrainException'>> something broke",
        )

        exc = metalk8s_drain.DrainTimeoutException("too slow!")
        self.assertEqual(
            str(exc),
            "<<class '_modules.metalk8s_drain.DrainTimeoutException'>> too slow!",
        )

    @utils.parameterized_from_cases(YAML_TESTS_CASES["evict_pod"])
    def test_evict_pod(
        self,
        result,
        raises=False,
        create_raises=False,
        create_error_status=None,
        create_error_body=None,
        log_lines=None,
        **kwargs
    ):
        """Tests for `metalk8s_drain.evict_pod`."""

        def _create_mock(*args, **kwargs):
            if create_raises == "ApiException":
                if create_error_body is None:
                    raise ApiException(status=create_error_status)
                else:
                    http_resp = MagicMock(
                        status=create_error_status,
                        data=json.dumps(create_error_body).encode("utf-8"),
                    )
                    raise ApiException(http_resp=http_resp)

            elif create_raises == "HTTPError":
                raise HTTPError()

        create_mock = MagicMock(side_effect=_create_mock)

        dynamic_client_mock = MagicMock()
        dynamic_client_mock.request.side_effect = create_mock

        dynamic_mock = MagicMock()
        dynamic_mock.DynamicClient.return_value = dynamic_client_mock
        with patch("kubernetes.dynamic", dynamic_mock), patch(
            "kubernetes.config", MagicMock()
        ), capture_logs(metalk8s_drain.log, logging.DEBUG) as captured:
            if raises:
                self.assertRaisesRegex(
                    CommandExecutionError, result, metalk8s_drain.evict_pod, **kwargs
                )
            else:
                self.assertEqual(metalk8s_drain.evict_pod(**kwargs), result)
                # TODO(gd): check that parameters match expected API call
                create_mock.assert_called_once()

            check_captured_logs(captured, log_lines)

    @parameterized.expand(
        [
            ("cordon successful", False),
            ("cordon failure", True),
        ]
    )
    def test_node_drain(self, _, cordon_raises):
        """Minimal tests for `metalk8s_drain.node_drain`.

        See `DrainTestCase` below for advanced behaviour tests.
        """
        call_kwargs = {"node_name": "example-node"}

        drain_cls_mock = MagicMock()
        run_drain_mock = drain_cls_mock.return_value.run_drain

        cordon_mock = MagicMock()
        if cordon_raises:
            result = "Some error occured when cordoning"
            cordon_mock.side_effect = CommandExecutionError(result)
        else:
            result = "Some result from drain"
            run_drain_mock.return_value = result

        salt_dict = {
            "metalk8s_kubernetes.cordon_node": cordon_mock,
        }
        with patch.dict(metalk8s_drain.__salt__, salt_dict), patch.object(
            metalk8s_drain, "Drain", drain_cls_mock
        ):
            if cordon_raises:
                self.assertRaisesRegex(
                    CommandExecutionError,
                    result,
                    metalk8s_drain.node_drain,
                    **call_kwargs
                )
                run_drain_mock.assert_not_called()
            else:
                self.assertEqual(metalk8s_drain.node_drain(**call_kwargs), result)
                run_drain_mock.assert_called_once()


class DrainTestCase(TestCase, mixins.LoaderModuleMockMixin):
    """Tests for the `Drain` interface used by the `metalk8s_drain` module.

    These are split from the main execution module tests, as we can consider
    this "drain" interface as a utility object.
    The `Drain` class will be tested from its `run_drain` method to avoid going
    too deep into unit-level tests of each available method, which wouldn't
    bring much value otherwise, since not used anywhere else in the code.
    """

    loader_module = metalk8s_drain

    def loader_module_globals(self):
        # This method is called on each `setUp` invocation, which will reset
        # the initial database for each test function
        self.api_mock = mock_kubernetes.KubernetesAPIMock(
            database={},
            resources={
                ("v1", "Pod"): "pods",
                ("apps/v1", "ReplicaSet"): "replicasets",
                ("apps/v1", "DaemonSet"): "daemonsets",
                ("__tests__", "EvictionMock"): "evictionmocks",
            },
        )

        def evict_pod_side_effect(name, namespace, **kwargs):
            existing_pod = self.api_mock.get_object(
                apiVersion="v1", kind="Pod", name=name, namespace=namespace
            )
            if existing_pod is None:
                return True

            eviction_mocks = self.api_mock.api.retrieve("evictionmocks")
            eviction_mock = next(
                (
                    mock
                    for mock in eviction_mocks
                    if mock["pod"] == "{}/{}".format(namespace, name)
                ),
                None,
            )
            if eviction_mock is not None:
                if eviction_mock.get("raises", False):
                    raise CommandExecutionError("Failed to evict pod")

                return not eviction_mock.get("locked", False)

            return True

        self.evict_pod_mock = MagicMock(side_effect=evict_pod_side_effect)

        return {
            "__salt__": {
                "metalk8s_kubernetes.get_object": self.api_mock.get_object,
                "metalk8s_kubernetes.list_objects": self.api_mock.list_objects,
            },
            "evict_pod": self.evict_pod_mock,
        }

    def seed_api_mock(self, dataset=None, events=None):
        self.api_mock.seed(YAML_TESTS_CASES["datasets"][dataset])
        self.time_mock = self.api_mock.time_mock_from_events(events or {})

    @utils.parameterized_from_cases(YAML_TESTS_CASES["drain"]["nominal"])
    def test_nominal(
        self, node_name, dataset, pods_to_evict, events=None, log_lines=None, **kwargs
    ):
        self.seed_api_mock(dataset, events)
        drainer = metalk8s_drain.Drain(node_name, timeout=30, **kwargs)

        with capture_logs(
            metalk8s_drain.log, logging.DEBUG
        ) as captured, self.time_mock.patch():
            result = drainer.run_drain()

        self.assertEqual(result, "Eviction complete.")
        check_captured_logs(captured, log_lines)
        self.assertEqual(self.evict_pod_mock.call_count, len(pods_to_evict))
        self.assertEqual(
            set(call[1]["name"] for call in self.evict_pod_mock.call_args_list),
            set(pods_to_evict),
        )

    @utils.parameterized_from_cases(YAML_TESTS_CASES["drain"]["dry-run"])
    def test_dry_run(self, node_name, dataset, pods_to_evict, **kwargs):
        self.seed_api_mock(dataset)
        drainer = metalk8s_drain.Drain(node_name, **kwargs)

        # Run in dry-run mode
        result = drainer.run_drain(dry_run=True)

        expected_result = "Prepared for eviction of pods: "
        if pods_to_evict:
            expected_result += ", ".join(pods_to_evict)
        else:
            expected_result += "no pods to evict."

        self.assertEqual(result, expected_result)
        self.evict_pod_mock.assert_not_called()

    @utils.parameterized_from_cases(YAML_TESTS_CASES["drain"]["eviction-filters"])
    def test_eviction_filters(
        self,
        node_name,
        dataset,
        pods_to_evict,
        log_lines=None,
        raises=False,
        raise_msg=None,
        **kwargs
    ):
        self.seed_api_mock(dataset)
        drainer = metalk8s_drain.Drain(node_name, **kwargs)

        with capture_logs(metalk8s_drain.log, logging.WARNING) as captured:
            if raises:
                self.assertRaisesRegex(
                    CommandExecutionError,
                    raise_msg,
                    drainer.run_drain,
                    dry_run=True,
                )
            else:
                result = drainer.run_drain(dry_run=True)
                expected_result = "Prepared for eviction of pods: "
                if pods_to_evict:
                    expected_result += ", ".join(pods_to_evict)
                else:
                    expected_result += "no pods to evict."
                self.assertEqual(result, expected_result)

        check_captured_logs(captured, log_lines)

    @utils.parameterized_from_cases(YAML_TESTS_CASES["drain"]["eviction-retry"])
    def test_eviction_retry(
        self, node_name, dataset, eviction_attempts, events=None, **kwargs
    ):
        """Check that eviction temporary failures (429) will be retried."""
        self.seed_api_mock(dataset, events)
        drainer = metalk8s_drain.Drain(node_name, **kwargs)

        with self.time_mock.patch():
            result = drainer.run_drain()

        self.assertEqual(result, "Eviction complete.")
        self.assertEqual(self.evict_pod_mock.call_count, eviction_attempts)

    @utils.parameterized_from_cases(YAML_TESTS_CASES["drain"]["waiting-for-eviction"])
    def test_waiting_for_eviction(
        self, node_name, dataset, sleep_time, events=None, **kwargs
    ):
        """Check that the drain waits for pods to become evicted."""
        self.seed_api_mock(dataset, events)
        drainer = metalk8s_drain.Drain(node_name, **kwargs)

        with self.time_mock.patch():
            result = drainer.run_drain()

        self.assertEqual(result, "Eviction complete.")
        self.assertEqual(self.time_mock.time(), sleep_time)

    @utils.parameterized_from_cases(YAML_TESTS_CASES["drain"]["timeout"])
    def test_timeout(self, node_name, dataset, **kwargs):
        """Check different sources of timeout."""
        self.seed_api_mock(dataset)
        drainer = metalk8s_drain.Drain(node_name, timeout=10, **kwargs)

        with self.time_mock.patch():
            self.assertRaisesRegex(
                CommandExecutionError,
                "Drain did not complete within 10 seconds",
                drainer.run_drain,
            )

    @utils.parameterized_from_cases(YAML_TESTS_CASES["drain"]["eviction-error"])
    def test_eviction_error(self, node_name, dataset, **kwargs):
        """Check that errors when evicting are stopping the drain process."""
        self.seed_api_mock(dataset)
        drainer = metalk8s_drain.Drain(node_name, **kwargs)

        with self.time_mock.patch():
            self.assertRaisesRegex(
                CommandExecutionError,
                "Failed to evict pod",
                drainer.run_drain,
            )
