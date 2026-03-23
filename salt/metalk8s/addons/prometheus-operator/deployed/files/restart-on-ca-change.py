#!/usr/bin/env python3
import hashlib
import os
import sys
from datetime import datetime, timezone

import requests

HASH_FILE_NAME = ".ca-hash-previous"

SA_TOKEN = "/var/run/secrets/kubernetes.io/serviceaccount/token"
SA_CA = "/var/run/secrets/kubernetes.io/serviceaccount/ca.crt"
K8S_API = "https://kubernetes.default.svc"


def hash_file(file_path: str) -> str:
    h = hashlib.sha256()
    with open(file_path, "rb") as f:
        h.update(f.read())
    return h.hexdigest()


def trigger_restart(namespace: str, deployment: str) -> None:
    with open(SA_TOKEN) as f:
        token = f.read()
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    body = {
        "spec": {
            "template": {
                "metadata": {
                    "annotations": {"kubectl.kubernetes.io/restartedAt": timestamp}
                }
            }
        }
    }
    url = f"{K8S_API}/apis/apps/v1/namespaces/{namespace}/deployments/{deployment}"
    response = requests.patch(
        url,
        json=body,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/strategic-merge-patch+json",
        },
        verify=SA_CA,
    )
    response.raise_for_status()


def main() -> None:
    ca_dir = os.environ["CA_DIR"]
    ca_file = os.path.join(ca_dir, os.environ["CA_FILE_NAME"])
    hash_file_path = os.path.join(ca_dir, HASH_FILE_NAME)

    if not os.path.exists(ca_file):
        print(f"CA file {ca_file} does not exist, skipping")
        return

    current_hash = hash_file(ca_file)

    if not os.path.exists(hash_file_path):
        with open(hash_file_path, "w") as f:
            f.write(current_hash)
        print("Initial CA load, skipping restart")
        return

    with open(hash_file_path) as f:
        previous_hash = f.read().strip()

    if current_hash == previous_hash:
        return

    namespace = os.environ["POD_NAMESPACE"]
    deployment = os.environ["DEPLOYMENT_NAME"]

    try:
        trigger_restart(namespace, deployment)
    except requests.RequestException as e:
        print(
            f"Failed to trigger restart for {deployment}: {e}",
            file=sys.stderr,
        )
        sys.exit(1)

    # Persist hash only after successful restart
    with open(hash_file_path, "w") as f:
        f.write(current_hash)
    print(f"Rolling restart triggered for {deployment}")


if __name__ == "__main__":
    main()
