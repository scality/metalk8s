from datetime import datetime
from importlib import reload
import os.path
from unittest.mock import MagicMock, patch
from unittest import TestCase


from parameterized import param, parameterized
from salt.exceptions import CommandExecutionError
import yaml

from _modules import metalk8s_monitoring

from tests.unit import mixins
from tests.unit import utils


YAML_TESTS_FILE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "files", "test_metalk8s_monitoring.yaml"
)
with open(YAML_TESTS_FILE) as fd:
    YAML_TESTS_CASES = yaml.safe_load(fd)


def _custom_name_func(testcase_func, _, param):
    return "{}_{}".format(testcase_func.__name__, param.kwargs["_id"].replace("-", "_"))


class Metalk8sMonitoringTestCase(TestCase, mixins.LoaderModuleMockMixin):
    """Tests for `metalk8s_monitoring` module."""

    loader_module = metalk8s_monitoring

    def test_virtual_nominal(self):
        """Test the nominal behaviour of `__virtual__`"""
        reload(metalk8s_monitoring)
        self.assertEqual(metalk8s_monitoring.__virtual__(), "metalk8s_monitoring")

    def test_virtual_missing_deps(self):
        """Test the behaviour of `__virtual__` when missing dependencies."""
        with utils.ForceImportErrorOn("requests"):
            reload(metalk8s_monitoring)
            self.assertTupleEqual(
                metalk8s_monitoring.__virtual__(),
                (False, "Missing dependencies: requests"),
            )

    @parameterized.expand(
        [
            param.explicit(kwargs=test_case)
            for test_case in YAML_TESTS_CASES["alertmanager_api_helper"]
        ],
        name_func=_custom_name_func,
    )
    def test_alertmanager_api_helper(
        self,
        _id,
        ips_and_ports,
        route,
        result,
        raises=False,
        called_with=None,
        request_called_once=True,
        request_raises=False,
        resp_body=None,
        resp_status=200,
        **kwargs
    ):
        """Test the private `_requests_alertmanager_api` helper."""
        get_service_ips_and_ports_mock = MagicMock(return_value=ips_and_ports)

        get_session_mock = MagicMock()
        session_mock = get_session_mock.return_value

        if request_raises:
            session_mock.request.side_effect = Exception(request_raises)
        else:
            response_mock = session_mock.request.return_value

            if isinstance(resp_body, dict):
                response_mock.json.return_value = resp_body
            else:
                response_mock.json.side_effect = ValueError("Invalid JSON response")
                response_mock.status_code = resp_status
                response_mock.text = resp_body

        utils_mocks = {
            "metalk8s.requests_retry_session": get_session_mock,
        }
        salt_mocks = {
            "metalk8s_kubernetes.get_service_ips_and_ports": get_service_ips_and_ports_mock,
        }
        with patch.dict(metalk8s_monitoring.__utils__, utils_mocks), patch.dict(
            metalk8s_monitoring.__salt__, salt_mocks
        ):
            if raises:
                self.assertRaisesRegex(
                    CommandExecutionError,
                    result,
                    metalk8s_monitoring._requests_alertmanager_api,
                    route,
                    **kwargs,
                )
            else:
                self.assertEqual(
                    metalk8s_monitoring._requests_alertmanager_api(route, **kwargs),
                    result,
                )

            if request_called_once:
                session_mock.request.assert_called_once()

            if called_with:
                args, kwargs = session_mock.request.call_args
                self.assertEqual(args, tuple(called_with["args"]))
                self.assertEqual(kwargs, called_with.get("kwargs", {}))

    @parameterized.expand(
        [
            param.explicit(kwargs=test_case)
            for test_case in YAML_TESTS_CASES["add_silence"]
        ],
        name_func=_custom_name_func,
    )
    def test_add_silence(self, _id, value, call_body, now_mock=None, **kwargs):
        request_mock = MagicMock()
        silence_id = "d287796c-cf59-4d10-8e5b-d5cc3ff51b9c"
        request_mock.return_value = {"silenceId": silence_id}

        with patch.object(
            metalk8s_monitoring, "_requests_alertmanager_api", request_mock
        ), patch.object(metalk8s_monitoring, "datetime") as datetime_mock:
            # NOTE: this special mocking is required because datetime.datetime
            # is a built-in, and its methods cannot be patched directly
            datetime_mock.strptime.side_effect = datetime.strptime
            datetime_mock.strftime.side_effect = datetime.strftime
            if now_mock is not None:
                datetime_mock.now.return_value = datetime.strptime(
                    now_mock, "%Y-%m-%dT%H:%M:%S"
                )
            else:
                datetime_mock.now.side_effect = datetime.now

            self.assertEqual(
                metalk8s_monitoring.add_silence(value, **kwargs), silence_id
            )

        request_mock.assert_called_once()
        _, call_kwargs = request_mock.call_args
        actual_body = call_kwargs["json"]
        self.assertEqual(dict(actual_body, **call_body), actual_body)

    def test_delete_silence(self):
        silence_id = "d287796c-cf59-4d10-8e5b-d5cc3ff51b9c"
        request_mock = MagicMock()
        with patch.object(
            metalk8s_monitoring, "_requests_alertmanager_api", request_mock
        ):
            metalk8s_monitoring.delete_silence(silence_id)

        request_mock.assert_called_once()
        self.assertEqual(
            request_mock.call_args[0],
            ("api/v2/silence/d287796c-cf59-4d10-8e5b-d5cc3ff51b9c", "DELETE"),
        )

    @parameterized.expand(
        [
            param.explicit(kwargs=test_case)
            for test_case in YAML_TESTS_CASES["get_silences"]
        ],
        name_func=_custom_name_func,
    )
    def test_get_silences(self, _id, response, result, state=None):
        request_mock = MagicMock(return_value=response)

        with patch.object(
            metalk8s_monitoring, "_requests_alertmanager_api", request_mock
        ):
            self.assertEqual(metalk8s_monitoring.get_silences(state=state), result)

    @parameterized.expand(
        [
            param.explicit(kwargs=test_case)
            for test_case in YAML_TESTS_CASES["get_alerts"]
        ],
        name_func=_custom_name_func,
    )
    def test_get_alerts(self, _id, response, result, state=None):
        request_mock = MagicMock(return_value=response)

        with patch.object(
            metalk8s_monitoring, "_requests_alertmanager_api", request_mock
        ):
            self.assertEqual(metalk8s_monitoring.get_alerts(state=state), result)
