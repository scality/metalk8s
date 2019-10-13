#
# Management of Solutions on MetalK8s
# ===================================
#
# Available states
# ----------------
#
# * available -> mount and expose images for configured Solution archives
#
# Configuration
# -------------
#
# These states depend on the `SolutionsConfiguration` file, located at
# /etc/metalk8s/solutions.yaml, to know which Solution archive to
# add/remove. It has the following format:
#
# ..code-block:: yaml
#
#   apiVersion: metalk8s.scality.com/v1alpha1
#   kind: SolutionsConfiguration
#   archives:
#     - /path/to/solution/archive.iso
#   active:
#     solution-name: X.Y.Z-suffix (or 'latest')
#
# Refer to each state documentation for more info on how actions are computed
# based on this file's contents and the system's state.
#

include:
  - .available
