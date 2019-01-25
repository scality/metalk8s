Goal
====

Describe several part of the bootstrap process on how things can be done and
how the content of the new platform layer should interact between each other
in the very early stage of the deployment

How
===

How do we distribute this new items ?
They should be gathered into a single archive of some sort
(TBD, maybe ISO, maybe .run).

First we need to distinguish the various component that might need to be
brought together into this single archive:

1. The platform layer itself

   a. Package repository

      The platform layer will need some packages for the initial phase of the
      deployment (likely K8s ones like kubelet, etcd, etc ...)
      The goal is to provide a local repository to bootstrap the first
      installation of the boostrap node.
      Mater on, this repository can be exposed to the rest of the cluster

   b. Docker registry

      A docker registry like service should be made available as part of the
      bootstrap.
      This will allow new solutions deployed to be made available to the
      orchestrator by pulling the images from this registry

2. Solution 


