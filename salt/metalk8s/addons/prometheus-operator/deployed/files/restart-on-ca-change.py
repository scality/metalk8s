#!/usr/bin/env python3
import hashlib
import json
import os
import ssl
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone

CA_DIR = "/tmp/secrets"
HASH_FILE = os.path.join(CA_DIR, ".ca-hash-previous")


def hash_dir(path):
    h = hashlib.sha256()
    for fname in sorted(os.listdir(path)):
        if fname.startswith("."):
            continue
        fpath = os.path.join(path, fname)
        if os.path.isfile(fpath):
            with open(fpath, "rb") as f:
                h.update(fname.encode())
                h.update(f.read())
    return h.hexdigest()


def trigger_restart(namespace, deployment):
    with open("/var/run/secrets/kubernetes.io/serviceaccount/token") as f:
        token = f.read()
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    body = json.dumps(
        {
            "spec": {
                "template": {
                    "metadata": {
                        "annotations": {"kubectl.kubernetes.io/restartedAt": timestamp}
                    }
                }
            }
        }
    ).encode()
    ctx = ssl.create_default_context(
        cafile="/var/run/secrets/kubernetes.io/serviceaccount/ca.crt"
    )
    url = (
        f"https://kubernetes.default.svc/apis/apps/v1"
        f"/namespaces/{namespace}/deployments/{deployment}"
    )
    req = urllib.request.Request(
        url,
        data=body,
        method="PATCH",
        headers={
            "Authorization": "Bearer " + token,
            "Content-Type": "application/strategic-merge-patch+json",
        },
    )
    urllib.request.urlopen(req, context=ctx)


def main():
    if not [f for f in os.listdir(CA_DIR) if not f.startswith(".")]:
        print("CA directory empty, skipping")
        return

    current_hash = hash_dir(CA_DIR)

    if not os.path.exists(HASH_FILE):
        with open(HASH_FILE, "w") as f:
            f.write(current_hash)
        print("Initial CA load, skipping restart")
        return

    with open(HASH_FILE) as f:
        previous_hash = f.read().strip()

    if current_hash == previous_hash:
        return

    namespace = os.environ["POD_NAMESPACE"]
    deployment = os.environ["DEPLOYMENT_NAME"]

    try:
        trigger_restart(namespace, deployment)
    except urllib.error.URLError as e:
        print(
            f"Failed to trigger restart for {deployment}: {e}",
            file=sys.stderr,
        )
        sys.exit(1)

    # Persist hash only after successful restart
    with open(HASH_FILE, "w") as f:
        f.write(current_hash)
    print(f"Rolling restart triggered for {deployment}")


if __name__ == "__main__":
    main()
