
def size_lvm_to_k8s(lvm_size):
    try:
        return int(lvm_size)
    except ValueError:
        if not lvm_size.lower().endswith('b'):
            return lvm_size + 'i'

class FilterModule(object):
    def filters(self):
        return {
            'size_lvm_to_k8s': size_lvm_to_k8s,
    }
