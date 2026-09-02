@post @ci @local @workloadplane
Feature: Workload Plane isolation detection and remediation
    A node that loses Workload Plane connectivity must be detected through the
    PodNetworkUnavailable condition, drained via a reversible NoExecute taint,
    and restored once connectivity recovers -- without over-reacting to a
    transient event or to a cluster-wide outage.

    Background:
        Given the Kubernetes API is available
        And the Prometheus API is available
        And the node-warden 'workload-plane-isolation' policy is deployed

    Scenario Outline: An isolated node is drained and recovers (<mode>)
        Given we are on a cluster with at least 3 workload-plane nodes
        And a test workload is running on every workload-plane node
        When we cut the Workload Plane network on a workload-plane node using '<mode>'
        Then the isolated node reports 'PodNetworkUnavailable' as 'True'
        And no other node reports 'PodNetworkUnavailable' as 'True'
        And the 'NodeWorkloadPlaneUnavailable' alert is firing
        And the isolated node gets the 'node.scality.com/workload-plane-unreachable' taint
        And the 'NodeWorkloadPlaneRemediated' alert is firing
        And the test workload has no endpoint on the isolated node
        When we restore the Workload Plane network on the isolated node
        Then the isolated node no longer reports 'PodNetworkUnavailable' as 'True'
        And the 'node.scality.com/workload-plane-unreachable' taint is removed from the isolated node
        And the 'NodeWorkloadPlaneUnavailable' alert clears
        And the 'NodeWorkloadPlaneRemediated' alert clears
        And the test workload has an endpoint on every workload-plane node

        Examples:
        | mode      |
        | link-down |
        | blocked   |

    Scenario: A Calico rolling restart does not trigger remediation
        When we trigger a rollout restart of 'daemonset/calico-node' in namespace 'kube-system'
        Then no node is tainted and alerts 'NodeWorkloadPlaneRemediated' do not fire within 90 seconds

    Scenario: A short Workload Plane blip does not trigger remediation
        Given the node control-plane IP is not equal to its workload-plane IP
        When we cut then restore the Workload Plane network on a workload-plane node within 20 seconds
        Then no node is tainted and alerts 'NodeWorkloadPlaneUnavailable,NodeWorkloadPlaneRemediated' do not fire within 90 seconds

    Scenario: A majority Workload Plane outage is not remediated but alerts
        Given we are on a multi node cluster
        When we cut the Workload Plane network on the majority of workload-plane nodes using 'blocked'
        Then no node is tainted and alerts 'NodeWorkloadPlaneRemediated' do not fire within 120 seconds
        And the 'NodeWorkloadPlaneUnavailable' alert is firing
        And the 'WorkloadPlaneOutage' alert is firing
        When we restore the Workload Plane network on all isolated nodes
        Then no node reports 'PodNetworkUnavailable' as 'True'
        And the 'WorkloadPlaneOutage' alert clears
