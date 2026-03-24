#!/usr/bin/env python3
import hashlib
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests

HASH_FILE_NAME = ".ca-hash-previous"

SA_TOKEN = Path("/var/run/secrets/kubernetes.io/serviceaccount/token")
SA_CA = Path("/var/run/secrets/kubernetes.io/serviceaccount/ca.crt")
K8S_API = "https://kubernetes.default.svc"


def hash_file(file_path: Path) -> str:
    h = hashlib.sha256()
    h.update(file_path.read_bytes())
    return h.hexdigest()


def trigger_restart(namespace: str, deployment: str) -> None:
    token = SA_TOKEN.read_text()
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
    ca_dir = Path(os.environ["CA_DIR"])
    ca_file = ca_dir / os.environ["CA_FILE_NAME"]
    hash_file_path = ca_dir / HASH_FILE_NAME

    if not ca_file.exists():
        print(f"CA file {ca_file} does not exist, skipping")
        return

    current_hash = hash_file(ca_file)

    if not hash_file_path.exists():
        hash_file_path.write_text(current_hash)
        print("Initial CA load, skipping restart")
        return

    previous_hash = hash_file_path.read_text().strip()

    if current_hash == previous_hash:
        return

    namespace = os.environ["DEPLOYMENT_NAMESPACE"]
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
    hash_file_path.write_text(current_hash)
    print(f"Rolling restart triggered for {deployment}")


if __name__ == "__main__":
    main()
