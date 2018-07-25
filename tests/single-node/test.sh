top_srcdir="$(realpath "$(pwd)/../..")"

ANSIBLE_FORCE_COLOR=true
export ANSIBLE_FORCE_COLOR

PROMETHEUS_NAMESPACE='kube-ops'

make_shell() {
        make --no-print-directory -C "${top_srcdir}" shell C="$*"
}

die() {
        exit 1
}

setup_suite() {
        echo "Creating loopback block-device and configuring VM"
        sudo truncate -s 256G /kube-lvm || die
        sudo losetup /dev/loop0 /kube-lvm || die

        echo "Disabling iptables"
        if systemctl is-enabled --quiet iptables; then
          sudo systemctl disable --now iptables || die
          sudo systemctl disable --now ip6tables || die
        fi
        sudo iptables -F || die
        sudo iptables -X || die

        echo "Creating shell environment"
        make_shell true

        echo "Deploy the cluster"
        make_shell ansible-playbook -i "$(pwd)/inventory" playbooks/deploy.yml || die

        KUBECONFIG=$(pwd)/inventory/artifacts/admin.conf
        export KUBECONFIG

        echo "Run a sample kubectl command"
        make_shell kubectl get nodes
}

test_deploy_again() {
        assert "make_shell ansible-playbook -i '$(pwd)/inventory' playbooks/deploy.yml"
}

test_reclaim_storage() {
        echo "Listing all PVs before test (some should be available)"
        make_shell kubectl get pv

        echo "Running simple Pod with PersistentVolumeClaim"
        make_shell kubectl apply -f - << EOF
kind: PersistentVolumeClaim
apiVersion: v1
metadata:
  name: testclaim
spec:
  accessModes:
    - ReadWriteOnce
  volumeMode: Filesystem
  resources:
    requests:
      storage: 2Gi
---
apiVersion: v1
kind: Pod
metadata:
  name: test-pv
spec:
  restartPolicy: Never
  containers:
  - name: test-pv
    image: busybox
    command: ['/bin/sh']
    args:
    - "-c"
    - "mount | grep /var/test_pv && touch /var/test_pv/foo"
    volumeMounts:
    - name: test-volume
      mountPath: /var/test_pv
  volumes:
  - name: test-volume
    persistentVolumeClaim:
      claimName: testclaim
EOF

        echo "Wait for Pod to exit"
        #TODO This could loop forever...
        until make_shell kubectl get pods test-pv -o jsonpath='{.status.phase}' | grep -E '(Failed|Succeeded)'; do
                echo "Sleeping..."
                sleep 1
        done

        RESULT=$(make_shell kubectl get pods test-pv -o jsonpath='{.status.phase}')
        echo "Pod exited, listing all PVs:"
        make_shell kubectl get pv

        echo "Cleaning up resources"
        make_shell kubectl delete pod test-pv
        make_shell kubectl delete pvc testclaim

        assert_equals "Succeeded" "${RESULT}"

        echo "Verify some PVs are in Released state"
        assert 'make_shell kubectl get pv -o jsonpath={.items[*].status.phase} | grep Released > /dev/null' \
                "No PVs in Released state"

        echo "Reclaim storage"
        make_shell ansible-playbook -i "$(pwd)/inventory" playbooks/reclaim-storage.yml

        echo "Verify that no PV is in released state"
        assert_fails 'make_shell kubectl get pv -o jsonpath={.items[*].status.phase} | grep Released > /dev/null' \
                "PVs in Released state found"
}

test_prometheus_node_exporter_metrics() {
        sudo yum install -y epel-release
        sudo yum install -y jq
        PROMETHEUS_IP=$(make_shell kubectl \
                        --namespace ${PROMETHEUS_NAMESPACE} \
                        get service kube-prometheus -o jsonpath={.spec.clusterIP})
        echo "Prometheus IP: ${PROMETHEUS_IP}"
        NB_TARGET=$(curl -s http://${PROMETHEUS_IP}:9090/api/v1/targets| \
          jq '.data.activeTargets |[.[]|select(.labels.job == $job)]|length' \
          --arg job "node-exporter")
        echo "Found ${NB_TARGET} targets"
        assert_not_equals 0 "${NB_TARGET}"
}

test_services_playbook() {
        assert "make_shell ansible-playbook -i '$(pwd)/inventory' playbooks/services.yml"
}
