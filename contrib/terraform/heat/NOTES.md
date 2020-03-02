## Mandatory

- deploy all nodes / infra with Heat, ingest with Terraform to only provision
  extra details (MetalK8s config + deployment actually)
- install Helm 2
- fetch Zenko charts
- deploy Zenko with known values (dependent on number of workers?)
- pass down keypair to Terraform
- import all infra in Terraform - easy dump?

## Nice to have

- add WaitCondition and signals to inform about current stack status
- root password access instead of user keypair (or choose one of the two?)