from kubernetes.client.rest import ApiException
import pytest
from pytest_bdd import given, parsers, scenario, then, when

from tests import salt_utils
from tests import utils

# Fixtures {{{

@pytest.fixture
def metalk8s_cli(request, host):
    iso_root = request.config.getoption('--iso-root')
    return command_runner(iso_root / 'metalk8s')

@pytest.fixture
def crictl(host):
    return command_runner('crictl')

# }}}
# Scenarii {{{

@scenario('../features/solutions.feature', 'Add a Solution to the cluster')
def test_add_solution(host):
    pass

@scenario('../features/solutions.feature', 'Remove a Solution from the cluster')
def test_remove_solution(host):
    pass

@scenario('../features/solutions.feature',
          'Deploy a Solution components in a specific version')
def test_deploy_solution_version(host):
    pass

@scenario('../features/solutions.feature',
          'Deploy a Solution components in the latest version')
def test_deploy_solution_latest(host):
    pass

@scenario('../features/solutions.feature', 'Undeploy a Solution components')
def test_undeploy_solution(host):
    pass

# }}}
# Given {{{

@given(parsers.parse('the Solution archive exists at "{archive_path}"'))
def solution_archive_exists(host, archive_path):
    assert host.file(archive_path).exists, (
        "Missing Solution archive at {}".format(archive_path)
    )

@given(parsers.parse('the Solution archive "{archive_path}" is available'))
def solution_is_available(host, metalk8s_cli, archive_path):
    available = salt_utils.get_pillar(host, 'metalk8s:solutions:available')

    archive_is_available = any(
        solution['archive'] == archive_path
        for name, solutions in available
        for solution in solutions
    )
    if not archive_is_available:
        metalk8s_cli('solutions add %s', archive_path)


@given(parsers.parse('the Solution archive "{archive_path}" is deployed'))
def solution_is_deployed(host, metalk8s_cli, archive_path):
    available = salt_utils.get_pillar(host, 'metalk8s:solutions:available')

    candidate = next((
        solution
        for name, solutions in available
        for solution in solutions
        if solution['archive'] == archive_path
    ), None)

    assert candidate is not None, (
        'Solution archive "{}" must be made available before deploying'
    ).format(archive_path)

    if not candidate['active']:
        solution_info = salt_utils.get_json(
            host, ['metalk8s.get_archive_info_from_iso', archive_path]
        )
        name = solution_info['name'].lower().replace(' ', '-')
        result = metalk8s_cli(
            'solutions deploy %s --use-version %s',
            name, solution_info['version'],
        )
        check_error(
            result,
            'Failed to deploy "{name}" [retcode {res.rc}]',
            name=name,
        )

# }}}
# When {{{

@when(parsers.parse('we add the Solution archive "{archive_path}"'))
def add_solution(metalk8s_cli, archive_path):
    metalk8s_cli('solutions add %s', archive_path)

@when(parsers.parse('we remove the Solution archive "{archive_path}"'))
def remove_solution(metalk8s_cli, archive_path):
    metalk8s_cli('solutions remove %s', archive_path)

@when(parsers.parse(
    'we deploy the Solution "{name}" with version "{version}"'
))
def deploy_solution(metalk8s_cli, name, version):
    if version == 'latest':
        # NOTE: we test this shortcut flag, but using `--use-version latest` is
        #       also valid.
        metalk8s_cli('solutions deploy %s --latest', name)
    else:
        metalk8s_cli('solutions deploy %s --use-version %s', name, version)

@when(parsers.parse('we undeploy the Solution "{name}"'))
def undeploy_solution(name):
    metalk8s_cli('solutions deploy %s --delete', name)

# }}}
# Then {{{

@then(parsers.parse('the Solution "{full_name}" is mounted at "{mountpoint}"'))
def archive_mounted(host, full_name, mountpoint):
    solution = get_solution_from_pillar(host, full_name)

    assert solution is not None, (
        'There is no archive available for Solution "{}"'.format(full_name)
    )

    assert solution['mountpoint'] == mountpoint, (
        'Solution "{}" should be mounted at "{}", not "{}"'.format(
            full_name, mountpoint, solution['mountpoint']
        )
    )

@then(parsers.parse('the mountpoint "{mountpoint}" is absent'))
def mountpoint_absent(host, mountpoint):
    assert not host.file(mountpoint).exists, (
        'Alleged mountpoint "{}" still exists'.format(mountpoint)
    )

@then(parsers.parse(
    'we can retrieve the image "{image}" from Solution "{solution}" repository'
))
def image_available(crictl, image, solution):
    images = list_images(crictl)
    full_tag = "metalk8s-registry-from-config.invalid/{}/{}".format(
        solution, image
    )
    if full_tag in images:
        # WARNING: this can be dangerous if used against a production
        #          environment with this image being only available in cache
        res = crictl('--debug rmi %s', images[full_tag]['id'])
        check_error(
            res,
            'Failed to purge image "{tag}" from containerd cache '
            'before attempting retrieval',
            tag=full_tag,
        )

    res = crictl('--debug pull %s', full_tag)
    check_error(
        res,
        'Failed to retrieve image "{image}" for Solution "{solution}"',
        image=image,
        solution=solution,
    )

@then(parsers.parse('the image "{image}" is not available from the registry'))
def image_unavailable(crictl, image):
    res = crictl('--debug pull %s', full_tag)
    assert res.rc == 1, format_message(
        res,
        'Expected return code when pulling "{image}" was 1, got {res.rc}',
        image=image,
    )

@then(parsers.parse(
    'the Admin UI for Solution "{name}" is exposed in version "{version}"'
))
def admin_ui_exposed(k8s_client, name, version):
    def _check_ui_exposed():
        try:
            service = k8s_client.read_namespaced_service(
                name='{}-ui'.format(name),
                namespace='metalk8s-solutions',
            )
        except ApiException as exc:
            assert ApiException.status != 404, (
                'Service "metalk8s-solutions/{}-ui" does not exist'.format(
                    name
                )
            )
            # If other than 404, this test will fail early
            pytest.fail(
                "Error when looking for Admin UI of Solution {}: {}".format(
                    name, exc
                )
            )

    utils.retry(
        _check_ui_exposed,
        times=10,
        wait=5,
        error_msg=(
            'Failed to find Admin UI of Solution {} after 10 attempts'.format(
                name
            )
        )
    )

@then(parsers.parse('no Admin UI for Solution "{name}" is exposed'))
def admin_ui_not_exposed(k8s_client, name):
    try:
        k8s_client.read_namespaced_service(
            name='{}-ui', namespace='metalk8s-solutions',
        )
    except ApiException as exc:
        assert exc.status == 404, (
            "Error when looking for Admin UI of Solution {}: {}".format(
                name, exc
            )
        )
    else:
        pytest.fail(
            'Service "metalk8s-solutions/{}-ui" does not exist'.format(name)
        )

@then(parsers.parse(
    'the Solution "{name}", with version "{version}", '
    'is marked as {mark} in the Pillar'
))
def check_solution_in_pillar(host, name, version, mark):
    full_name = '{}-{}'.format(name, version)
    solution = get_solution_from_pillar(host, full_name)

    assert solution is not None, (
        'Solution "{}" is not in the Pillar'.format(full_name)
    )

    if mark == 'active':
        assert solution['active'], (
            'Solution "{}" should be marked as active'.format(full_name)
        )
    elif mark == 'inactive':
        assert not solution['active'], (
            'Solution "{}" should be marked as inactive'.format(full_name)
        )
    else:
        pytest.fail(
            'Invalid mark used in definition: {} '
            '(choose one of "active" and "inactive")'.format(mark)
        )

# }}}
# Helpers {{{

def format_message(result, message,
                    *fmt_args,
                    _print_stdout=True, _print_stderr=True,
                    **fmt_kwargs):
    final = message.format(*fmt_args, res=result, **fmt_kwargs)
    if _print_stdout:
        final += '\n--- stdout ---\n{}\n'.format(result.stdout)
    if _print_stderr:
        final += '\n--- stderr ---\n{}\n'.format(result.stderr)
    return final

def check_error(result, message, *fmt_args, **fmt_kwargs):
    assert result.rc == 0, format_message(
        result, message, *fmt_args, **fmt_kwargs
    )

def get_solution_from_pillar(host, full_name):
    available = salt_utils.get_pillar(host, 'metalk8s:solutions:available')

    return next((
        solution
        for name, solutions in available
        for solution in solutions
        if solution['id'] == full_name
    ), None)

def command_runner(host, executable):
    def run(command, *args, **kwargs):
        with host.sudo():
            return host.run(str(executable), command, *args, **kwargs)
    return run

def list_images(crictl):
    result = crictl('images --output json')
    check_error(result, 'Failed to list container images [retcode {res.rc}]')

    try:
        images = json.loads(result.stdout)
    except Exception as exc:
        pytest.fail('Failed to parse list of container images: {}'.format(exc))

    return {
        image['repoTags'][0]: image for image in images if image['repoTags']
    }

# }}}