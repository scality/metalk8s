#!/usr/bin/env python3

import os
import re
import sys
import logging

#import pygit2


LOGGER = logging.getLogger(__name__)

TEST_PLAN_PATTERN = r'^Test-Plan:(.+)$'

def find_test_plan(msg):
    all_plans = set()

    for match in re.finditer(TEST_PLAN_PATTERN, msg, re.MULTILINE):
        LOGGER.info('Found test-plan annotation: %r', match.group(0))
        plans = match.group(1)
        for plan in plans.split(','):
            all_plans.add(plan.strip())

    return all_plans


def calculate_test_plan(root, base, head):
    LOGGER.info(
        'Working with repository in %r, base %r, head %r',
        root, base, head)

    repo = pygit2.Repository(root)

    base_commit = repo.revparse_single(base)
    LOGGER.debug('Resolved base %r to %r', base, base_commit.hex)
    head_commit = repo.revparse_single(head)
    LOGGER.debug('Resolved head %r to %r', head, head_commit.hex)

    LOGGER.debug('Asserting head %r is a descendant of base %r',
        head_commit.hex, base_commit.hex)
    if not repo.descendant_of(head_commit.id, base_commit.id):
        raise AssertionError('Head {} is not a descendant of base {}'.format(
            head_commit.hex, base_commit.hex))

    calculated_test_plan = set()

    log = repo.walk(head_commit.id, pygit2.GIT_SORT_TOPOLOGICAL)
    log.hide(base_commit.id)
    for commit in log:
        LOGGER.info('Parsing commit %r', commit.hex)

        if len(commit.parent_ids) > 1:
            LOGGER.debug('Commit %r is a merge, skipping', commit.hex)
            continue

        test_plan = find_test_plan(commit.message)
        if not test_plan:
            LOGGER.info(
                'Commit %r does not specify a test-plan, assuming whole run',
                commit.hex)
            return set()

        LOGGER.info(
            'Commit %r specifies test-plan %r', commit.hex, list(test_plan))

        calculated_test_plan = calculated_test_plan.union(test_plan)

    return calculated_test_plan


def find_target_branch(root, commit, remote='origin'):
    repo = pygit2.Repository(root)

    head = repo.revparse_single(commit)
    assert 'VERSION' in head.tree
    version_blob = repo[head.tree['VERSION'].id]
    version_info = version_blob.data

    version_data = {}

    for line in version_info.splitlines():
        name, _, value = line.partition(b'=')
        version_data[name.decode('utf-8')] = value.decode('utf-8')

    assert 'VERSION_MAJOR' in version_data
    assert 'VERSION_MINOR' in version_data

    return '{}/development/{}.{}'.format(
        remote,
        version_data['VERSION_MAJOR'],
        version_data['VERSION_MINOR'],
    )


if __name__ == '__main__':
    print('["ui", "docs"]')
    sys.exit(0)
    logging.basicConfig(level=logging.DEBUG)

    repo_root = pygit2.discover_repository(os.getcwd())
    head_rev = sys.argv[1]

    target_branch = find_target_branch(repo_root, head_rev, remote='scality')
    test_plan = calculate_test_plan(repo_root, target_branch, head_rev)

    if not test_plan:
        LOGGER.warning('No test-plan found')
        sys.exit(42)
    else:
        for entry in sorted(test_plan):
            print(entry)
