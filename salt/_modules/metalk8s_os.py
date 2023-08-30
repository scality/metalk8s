"""
MetalK8s OS module
"""

__virtualname__ = "metalk8s_os"


def __virtual__():
    return __virtualname__


def get_kubereserved():
    """Get kubeReserved memory and cpu allocations following Google's GKE recommandations.

    For CPU resources, GKE reserves the following:
    - 6% of the first core
    - 1% of the next core (up to 2 cores)
    - 0.5% of the next 2 cores (up to 4 cores)
    - 0.25% of any cores above 4 cores

    For memory resources, GKE reserves the following:
    - 255 MiB of memory for machines with less than 1 GB of memory
    - 25% of the first 4GB of memory
    - 20% of the next 4GB of memory (up to 8GB)
    - 10% of the next 8GB of memory (up to 16GB)
    - 6% of the next 112GB of memory (up to 128GB)
    - 2% of any memory above 128GB


    https://cloud.google.com/kubernetes-engine/docs/concepts/plan-node-sizes#memory_and_cpu_reservations
    https://learnk8s.io/allocatable-resources
    """

    os_cpu = __grains__["num_cpus"]

    core_1 = 0.06
    cores_2 = 0.01 * max([(min([os_cpu, 2]) - 1), 0])
    cores_4 = 0.005 * max([(min([os_cpu, 4]) - 2), 0])
    cores_above_4 = 0.0025 * max([(os_cpu - 4), 0])

    kube_cpu = round((core_1 + cores_2 + cores_4 + cores_above_4) * 1000)

    os_memory = __grains__["mem_total"]

    gb_4 = 4 * 1024
    gb_8 = 8 * 1024
    gb_16 = 16 * 1024
    gb_128 = 128 * 1024

    memory_4 = 0.25 * min([os_memory, gb_4])
    memory_8 = 0.2 * max([(min([os_memory, gb_8]) - gb_4), 0])
    memory_16 = 0.1 * max([(min([os_memory, gb_16]) - gb_8), 0])
    memory_128 = 0.06 * max([(min([os_memory, gb_128]) - gb_16), 0])
    memory_above_128 = 0.02 * max([(os_memory - gb_128), 0])

    kube_memory = round(memory_4 + memory_8 + memory_16 + memory_128 + memory_above_128)

    # CPU is in millicores, memory is in MiB
    return {"cpu": f"{kube_cpu}m", "memory": f"{kube_memory}Mi"}
