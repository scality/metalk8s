import os.path
from unittest import TestCase
from unittest.mock import MagicMock, patch

from parameterized import param, parameterized
from salt.exceptions import CommandExecutionError
import yaml

from _runners import metalk8s_saltutil

from tests.unit import mixins
from tests.unit import utils


YAML_TESTS_FILE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "files", "test_metalk8s_saltutil.yaml"
)
with open(YAML_TESTS_FILE) as fd:
    YAML_TESTS_CASES = yaml.safe_load(fd)


class Metalk8sSaltutilTestCase(TestCase, mixins.LoaderModuleMockMixin):
    """
    TestCase for `metalk8s_saltutil` runner
    """

    loader_module = metalk8s_saltutil

    def test_sync_auth(self):
        """
        Tests the return of `sync_auth` function
        """
        sync_mock = MagicMock()

        with patch("salt.utils.extmods.sync", sync_mock):
            metalk8s_saltutil.sync_auth(saltenv="my-salt-env")

            sync_mock.assert_called_once()
            assert "auth" in sync_mock.call_args[0]
            self.assertDictContainsSubset(
                {"saltenv": "my-salt-env"}, sync_mock.call_args[1]
            )

    @utils.parameterized_from_cases(YAML_TESTS_CASES["accept_minion"])
    def test_accept_minion(self, result, up_ret=None, wheel_ret=None, raises=False):
        """
        Tests the return of `accept_minion` function
        """
        minion_id = "my-minion"

        def cmd_mock(fun, *_args, **_kwargs):
            if fun == "saltutil.wheel":
                return wheel_ret
            return None

        cmd_mock = MagicMock(side_effect=cmd_mock)
        up_mock = MagicMock(return_value=up_ret or [])

        salt_dict = {"salt.cmd": cmd_mock, "manage.up": up_mock}

        with patch.dict(metalk8s_saltutil.__salt__, salt_dict):
            if raises:
                self.assertRaisesRegex(
                    CommandExecutionError,
                    result,
                    metalk8s_saltutil.accept_minion,
                    minion_id,
                )
            else:
                self.assertEqual(metalk8s_saltutil.accept_minion(minion_id), result)

            up_mock.assert_called_once()
            if wheel_ret:
                cmd_mock.assert_called_once()
            else:
                cmd_mock.assert_not_called()

    @utils.parameterized_from_cases(YAML_TESTS_CASES["wait_minions"])
    def test_wait_minions(
        self, result, ping_ret=True, is_running_ret=False, raises=False
    ):
        """
        Tests the return of `wait_minions` function
        """
        minion_id = "my-minion"

        def cmd_mock(_tgt, command, **_kwargs):
            ret = None
            if command == "test.ping":
                ret = ping_ret
            elif command == "saltutil.is_running":
                ret = is_running_ret

            if ret is None:
                raise CommandExecutionError("An ErrOr Occurred")
            if isinstance(ret, list):
                ret = ret.pop(0)
            if isinstance(ret, dict):
                return ret
            return {minion_id: ret}

        salt_client_mock = MagicMock()
        salt_client_mock.return_value.cmd.side_effect = cmd_mock

        with patch("salt.client.get_local_client", salt_client_mock), patch(
            "time.sleep", MagicMock()
        ), patch.dict(metalk8s_saltutil.__opts__, {"conf_file": "my-conf"}):
            if raises:
                self.assertRaisesRegex(
                    CommandExecutionError,
                    result,
                    metalk8s_saltutil.wait_minions,
                )
            else:
                self.assertEqual(metalk8s_saltutil.wait_minions(), result)

        # If we retry, check that we used all expected attempts
        if isinstance(ping_ret, list):
            self.assertEqual(len(ping_ret), 0)
        if isinstance(is_running_ret, list):
            self.assertEqual(len(is_running_ret), 0)
