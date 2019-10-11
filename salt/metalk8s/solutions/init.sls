#
# Management of Solutions on MetalK8s
# ===================================
#
# Available states
# ----------------
#
# * available -> mount and expose images for configured Solution archives
# * deployed  -> deploy cluster-wide components for active Solution versions
#
# Configuration
# -------------
#
# These states depend on the `SolutionsConfiguration` file, located at
# /etc/metalk8s/solutions.yaml, to know which Solution archive/version to
# add/remove/deploy. It has the following format:
#
# ..code-block:: yaml
#
#   apiVersion: metalk8s.scality.com/v1alpha1
#   kind: SolutionsConfiguration
#   archives:
#     - {{ solution.iso }}
#   active:
#     {{ solution.name }}: {{ solution.version }} (or 'latest')
#
# Refer to each state documentation for more info on how actions are computed
# based on this file's contents and the system's state.
#

include:
  - .available
