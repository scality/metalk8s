# -*- coding: utf-8 -*-
'''
Manage kubernetes resources as salt states
==========================================

NOTE: This module requires the proper pillar values set. See
salt.modules.kubernetes for more information.

.. warning::

    Configuration options will change in 2019.2.0.

The kubernetes module is used to manage different kubernetes resources.


.. code-block:: yaml

    my-nginx:
      kubernetes.deployment_present:
        - namespace: default
          metadata:
            app: frontend
          spec:
            replicas: 1
            template:
              metadata:
                labels:
                  run: my-nginx
              spec:
                containers:
                - name: my-nginx
                  image: nginx
                  ports:
                  - containerPort: 80

    my-mariadb:
      kubernetes.deployment_absent:
        - namespace: default

    # kubernetes deployment as specified inside of
    # a file containing the definition of the the
    # deployment using the official kubernetes format
    redis-master-deployment:
      kubernetes.deployment_present:
        - name: redis-master
        - source: salt://k8s/redis-master-deployment.yml
      require:
        - pip: kubernetes-python-module

    # kubernetes service as specified inside of
    # a file containing the definition of the the
    # service using the official kubernetes format
    redis-master-service:
      kubernetes.service_present:
        - name: redis-master
        - source: salt://k8s/redis-master-service.yml
      require:
        - kubernetes.deployment_present: redis-master

    # kubernetes deployment as specified inside of
    # a file containing the definition of the the
    # deployment using the official kubernetes format
    # plus some jinja directives
     nginx-source-template:
      kubernetes.deployment_present:
        - source: salt://k8s/nginx.yml.jinja
        - template: jinja
      require:
        - pip: kubernetes-python-module


    # Kubernetes secret
    k8s-secret:
      kubernetes.secret_present:
        - name: top-secret
          data:
            key1: value1
            key2: value2
            key3: value3

.. versionadded: 2017.7.0
'''
from __future__ import absolute_import

import copy
import logging
import yaml

# Import 3rd-party libs
from salt.ext import six
import salt.utils.dictdiffer

log = logging.getLogger(__name__)


__virtualname__ = 'metalk8s_kubernetes'


def __virtual__():
    '''
    Only load if the kubernetes module is available in __salt__
    '''
    if 'metalk8s_kubernetes.ping' not in __salt__:
        return False, '`metalk8s_kubernetes.ping` not available'
    else:
        return __virtualname__


def _error(ret, err_msg):
    '''
    Helper function to propagate errors to
    the end user.
    '''
    ret['result'] = False
    ret['comment'] = err_msg
    return ret


def deployment_absent(name, namespace='default', **kwargs):
    '''
    Ensures that the named deployment is absent from the given namespace.

    name
        The name of the deployment

    namespace
        The name of the namespace
    '''

    ret = {'name': name,
           'changes': {},
           'result': False,
           'comment': ''}

    deployment = __salt__['metalk8s_kubernetes.show_deployment'](name, namespace, **kwargs)

    if deployment is None:
        ret['result'] = True if not __opts__['test'] else None
        ret['comment'] = 'The deployment does not exist'
        return ret

    if __opts__['test']:
        ret['comment'] = 'The deployment is going to be deleted'
        ret['result'] = None
        return ret

    res = __salt__['metalk8s_kubernetes.delete_deployment'](name, namespace, **kwargs)
    if res['code'] == 200:
        ret['result'] = True
        ret['changes'] = {
            'metalk8s_kubernetes.deployment': {
                'new': 'absent', 'old': 'present'}}
        ret['comment'] = res['message']
    else:
        ret['comment'] = 'Something went wrong, response: {0}'.format(res)

    return ret


def deployment_present(
        name,
        namespace='default',
        metadata=None,
        spec=None,
        source='',
        template='',
        **kwargs):
    '''
    Ensures that the named deployment is present inside of the specified
    namespace with the given metadata and spec.
    If the deployment exists it will be replaced.

    name
        The name of the deployment.

    namespace
        The namespace holding the deployment. The 'default' one is going to be
        used unless a different one is specified.

    metadata
        The metadata of the deployment object.

    spec
        The spec of the deployment object.

    source
        A file containing the definition of the deployment (metadata and
        spec) in the official kubernetes format.

    template
        Template engine to be used to render the source file.
    '''
    ret = {'name': name,
           'changes': {},
           'result': False,
           'comment': ''}

    if (metadata or spec) and source:
        return _error(
            ret,
            '\'source\' cannot be used in combination with \'metadata\' or '
            '\'spec\''
        )

    if metadata is None:
        metadata = {}

    if spec is None:
        spec = {}

    deployment = __salt__['metalk8s_kubernetes.show_deployment'](name, namespace, **kwargs)

    if deployment is None:
        if __opts__['test']:
            ret['result'] = None
            ret['comment'] = 'The deployment is going to be created'
            return ret
        res = __salt__['metalk8s_kubernetes.create_deployment'](name=name,
                                                       namespace=namespace,
                                                       metadata=metadata,
                                                       spec=spec,
                                                       source=source,
                                                       template=template,
                                                       saltenv=__env__,
                                                       **kwargs)
        ret['changes']['{0}.{1}'.format(namespace, name)] = {
            'old': {},
            'new': res}
    else:
        if __opts__['test']:
            ret['result'] = None
            return ret

        # TODO: improve checks  # pylint: disable=fixme
        log.info('Forcing the recreation of the deployment')
        ret['comment'] = 'The deployment is already present. Forcing recreation'
        res = __salt__['metalk8s_kubernetes.replace_deployment'](
            name=name,
            namespace=namespace,
            metadata=metadata,
            spec=spec,
            source=source,
            template=template,
            saltenv=__env__,
            **kwargs)

    ret['changes'] = {
        'metadata': metadata,
        'spec': spec
    }
    ret['result'] = True
    return ret


def service_present(
        name,
        namespace='default',
        metadata=None,
        spec=None,
        source='',
        template='',
        **kwargs):
    '''
    Ensures that the named service is present inside of the specified namespace
    with the given metadata and spec.
    If the deployment exists it will be replaced.

    name
        The name of the service.

    namespace
        The namespace holding the service. The 'default' one is going to be
        used unless a different one is specified.

    metadata
        The metadata of the service object.

    spec
        The spec of the service object.

    source
        A file containing the definition of the service (metadata and
        spec) in the official kubernetes format.

    template
        Template engine to be used to render the source file.
    '''
    ret = {'name': name,
           'changes': {},
           'result': False,
           'comment': ''}

    if (metadata or spec) and source:
        return _error(
            ret,
            '\'source\' cannot be used in combination with \'metadata\' or '
            '\'spec\''
        )

    if metadata is None:
        metadata = {}

    if spec is None:
        spec = {}

    service = __salt__['metalk8s_kubernetes.show_service'](name, namespace, **kwargs)

    if service is None:
        if __opts__['test']:
            ret['result'] = None
            ret['comment'] = 'The service is going to be created'
            return ret
        res = __salt__['metalk8s_kubernetes.create_service'](name=name,
                                                    namespace=namespace,
                                                    metadata=metadata,
                                                    spec=spec,
                                                    source=source,
                                                    template=template,
                                                    saltenv=__env__,
                                                    **kwargs)
        ret['changes']['{0}.{1}'.format(namespace, name)] = {
            'old': {},
            'new': res}
    else:
        if __opts__['test']:
            ret['result'] = None
            return ret

        # TODO: improve checks  # pylint: disable=fixme
        log.info('Forcing the recreation of the service')
        ret['comment'] = 'The service is already present. Forcing recreation'
        res = __salt__['metalk8s_kubernetes.replace_service'](
            name=name,
            namespace=namespace,
            metadata=metadata,
            spec=spec,
            source=source,
            template=template,
            old_service=service,
            saltenv=__env__,
            **kwargs)

    ret['changes'] = {
        'metadata': metadata,
        'spec': spec
    }
    ret['result'] = True
    return ret


def service_absent(name, namespace='default', **kwargs):
    '''
    Ensures that the named service is absent from the given namespace.

    name
        The name of the service

    namespace
        The name of the namespace
    '''

    ret = {'name': name,
           'changes': {},
           'result': False,
           'comment': ''}

    service = __salt__['metalk8s_kubernetes.show_service'](name, namespace, **kwargs)

    if service is None:
        ret['result'] = True if not __opts__['test'] else None
        ret['comment'] = 'The service does not exist'
        return ret

    if __opts__['test']:
        ret['comment'] = 'The service is going to be deleted'
        ret['result'] = None
        return ret

    res = __salt__['metalk8s_kubernetes.delete_service'](name, namespace, **kwargs)
    if res['code'] == 200:
        ret['result'] = True
        ret['changes'] = {
            'metalk8s_kubernetes.service': {
                'new': 'absent', 'old': 'present'}}
        ret['comment'] = res['message']
    else:
        ret['comment'] = 'Something went wrong, response: {0}'.format(res)

    return ret


def namespace_absent(name, **kwargs):
    '''
    Ensures that the named namespace is absent.

    name
        The name of the namespace
    '''

    ret = {'name': name,
           'changes': {},
           'result': False,
           'comment': ''}

    namespace = __salt__['metalk8s_kubernetes.show_namespace'](name, **kwargs)

    if namespace is None:
        ret['result'] = True if not __opts__['test'] else None
        ret['comment'] = 'The namespace does not exist'
        return ret

    if __opts__['test']:
        ret['comment'] = 'The namespace is going to be deleted'
        ret['result'] = None
        return ret

    res = __salt__['metalk8s_kubernetes.delete_namespace'](name, **kwargs)
    if (
            res['code'] == 200 or
            (
                isinstance(res['status'], six.string_types) and
                'Terminating' in res['status']
            ) or
            (
                isinstance(res['status'], dict) and
                res['status']['phase'] == 'Terminating'
            )):
        ret['result'] = True
        ret['changes'] = {
            'metalk8s_kubernetes.namespace': {
                'new': 'absent', 'old': 'present'}}
        if res['message']:
            ret['comment'] = res['message']
        else:
            ret['comment'] = 'Terminating'
    else:
        ret['comment'] = 'Something went wrong, response: {0}'.format(res)

    return ret


def namespace_present(name, **kwargs):
    '''
    Ensures that the named namespace is present.

    name
        The name of the namespace.

    '''
    ret = {'name': name,
           'changes': {},
           'result': False,
           'comment': ''}

    namespace = __salt__['metalk8s_kubernetes.show_namespace'](name, **kwargs)

    if namespace is None:
        if __opts__['test']:
            ret['result'] = None
            ret['comment'] = 'The namespace is going to be created'
            return ret

        res = __salt__['metalk8s_kubernetes.create_namespace'](name, **kwargs)
        ret['result'] = True
        ret['changes']['namespace'] = {
            'old': {},
            'new': res}
    else:
        ret['result'] = True if not __opts__['test'] else None
        ret['comment'] = 'The namespace already exists'

    return ret


def secret_absent(name, namespace='default', **kwargs):
    '''
    Ensures that the named secret is absent from the given namespace.

    name
        The name of the secret

    namespace
        The name of the namespace
    '''

    ret = {'name': name,
           'changes': {},
           'result': False,
           'comment': ''}

    secret = __salt__['metalk8s_kubernetes.show_secret'](name, namespace, **kwargs)

    if secret is None:
        ret['result'] = True if not __opts__['test'] else None
        ret['comment'] = 'The secret does not exist'
        return ret

    if __opts__['test']:
        ret['comment'] = 'The secret is going to be deleted'
        ret['result'] = None
        return ret

    __salt__['metalk8s_kubernetes.delete_secret'](name, namespace, **kwargs)

    # As for kubernetes 1.6.4 doesn't set a code when deleting a secret
    # The kubernetes module will raise an exception if the kubernetes
    # server will return an error
    ret['result'] = True
    ret['changes'] = {
        'metalk8s_kubernetes.secret': {
            'new': 'absent', 'old': 'present'}}
    ret['comment'] = 'Secret deleted'
    return ret


def secret_present(
        name,
        namespace='default',
        data=None,
        source=None,
        template=None,
        **kwargs):
    '''
    Ensures that the named secret is present inside of the specified namespace
    with the given data.
    If the secret exists it will be replaced.

    name
        The name of the secret.

    namespace
        The namespace holding the secret. The 'default' one is going to be
        used unless a different one is specified.

    data
        The dictionary holding the secrets.

    source
        A file containing the data of the secret in plain format.

    template
        Template engine to be used to render the source file.
    '''
    ret = {'name': name,
           'changes': {},
           'result': False,
           'comment': ''}

    if data and source:
        return _error(
            ret,
            '\'source\' cannot be used in combination with \'data\''
        )

    secret = __salt__['metalk8s_kubernetes.show_secret'](name, namespace, **kwargs)

    if secret is None:
        if data is None:
            data = {}

        if __opts__['test']:
            ret['result'] = None
            ret['comment'] = 'The secret is going to be created'
            return ret
        res = __salt__['metalk8s_kubernetes.create_secret'](name=name,
                                                   namespace=namespace,
                                                   data=data,
                                                   source=source,
                                                   template=template,
                                                   saltenv=__env__,
                                                   **kwargs)
        ret['changes']['{0}.{1}'.format(namespace, name)] = {
            'old': {},
            'new': res}
    else:
        if __opts__['test']:
            ret['result'] = None
            ret['comment'] = 'The secret is going to be replaced'
            return ret

        # TODO: improve checks  # pylint: disable=fixme
        log.info('Forcing the recreation of the service')
        ret['comment'] = 'The secret is already present. Forcing recreation'
        res = __salt__['metalk8s_kubernetes.replace_secret'](
            name=name,
            namespace=namespace,
            data=data,
            source=source,
            template=template,
            saltenv=__env__,
            **kwargs)

    ret['changes'] = {
        # Omit values from the return. They are unencrypted
        # and can contain sensitive data.
        'data': list(res['data'])
    }
    ret['result'] = True

    return ret


def configmap_absent(name, namespace='default', **kwargs):
    '''
    Ensures that the named configmap is absent from the given namespace.

    name
        The name of the configmap

    namespace
        The namespace holding the configmap. The 'default' one is going to be
        used unless a different one is specified.
    '''

    ret = {'name': name,
           'changes': {},
           'result': False,
           'comment': ''}

    configmap = __salt__['metalk8s_kubernetes.show_configmap'](name, namespace, **kwargs)

    if configmap is None:
        ret['result'] = True if not __opts__['test'] else None
        ret['comment'] = 'The configmap does not exist'
        return ret

    if __opts__['test']:
        ret['comment'] = 'The configmap is going to be deleted'
        ret['result'] = None
        return ret

    __salt__['metalk8s_kubernetes.delete_configmap'](name, namespace, **kwargs)
    # As for kubernetes 1.6.4 doesn't set a code when deleting a configmap
    # The kubernetes module will raise an exception if the kubernetes
    # server will return an error
    ret['result'] = True
    ret['changes'] = {
        'metalk8s_kubernetes.configmap': {
            'new': 'absent', 'old': 'present'}}
    ret['comment'] = 'ConfigMap deleted'

    return ret


def configmap_present(
        name,
        namespace='default',
        data=None,
        source=None,
        template=None,
        **kwargs):
    '''
    Ensures that the named configmap is present inside of the specified namespace
    with the given data.
    If the configmap exists it will be replaced.

    name
        The name of the configmap.

    namespace
        The namespace holding the configmap. The 'default' one is going to be
        used unless a different one is specified.

    data
        The dictionary holding the configmaps.

    source
        A file containing the data of the configmap in plain format.

    template
        Template engine to be used to render the source file.
    '''
    ret = {'name': name,
           'changes': {},
           'result': False,
           'comment': ''}

    if data and source:
        return _error(
            ret,
            '\'source\' cannot be used in combination with \'data\''
        )
    elif data is None:
        data = {}

    configmap = __salt__['metalk8s_kubernetes.show_configmap'](name, namespace, **kwargs)

    if configmap is None:
        if __opts__['test']:
            ret['result'] = None
            ret['comment'] = 'The configmap is going to be created'
            return ret
        res = __salt__['metalk8s_kubernetes.create_configmap'](name=name,
                                                      namespace=namespace,
                                                      data=data,
                                                      source=source,
                                                      template=template,
                                                      saltenv=__env__,
                                                      **kwargs)
        ret['changes']['{0}.{1}'.format(namespace, name)] = {
            'old': {},
            'new': res}
    else:
        if __opts__['test']:
            ret['result'] = None
            ret['comment'] = 'The configmap is going to be replaced'
            return ret

        # TODO: improve checks  # pylint: disable=fixme
        log.info('Forcing the recreation of the service')
        ret['comment'] = 'The configmap is already present. Forcing recreation'
        res = __salt__['metalk8s_kubernetes.replace_configmap'](
            name=name,
            namespace=namespace,
            data=data,
            source=source,
            template=template,
            saltenv=__env__,
            **kwargs)

    ret['changes'] = {
        'data': res['data']
    }
    ret['result'] = True
    return ret


def pod_absent(name, namespace='default', **kwargs):
    '''
    Ensures that the named pod is absent from the given namespace.

    name
        The name of the pod

    namespace
        The name of the namespace
    '''

    ret = {'name': name,
           'changes': {},
           'result': False,
           'comment': ''}

    pod = __salt__['metalk8s_kubernetes.show_pod'](name, namespace, **kwargs)

    if pod is None:
        ret['result'] = True if not __opts__['test'] else None
        ret['comment'] = 'The pod does not exist'
        return ret

    if __opts__['test']:
        ret['comment'] = 'The pod is going to be deleted'
        ret['result'] = None
        return ret

    res = __salt__['metalk8s_kubernetes.delete_pod'](name, namespace, **kwargs)
    if res['code'] == 200 or res['code'] is None:
        ret['result'] = True
        ret['changes'] = {
            'metalk8s_kubernetes.pod': {
                'new': 'absent', 'old': 'present'}}
        if res['code'] is None:
            ret['comment'] = 'In progress'
        else:
            ret['comment'] = res['message']
    else:
        ret['comment'] = 'Something went wrong, response: {0}'.format(res)

    return ret


def pod_present(
        name,
        namespace='default',
        metadata=None,
        spec=None,
        source='',
        template='',
        **kwargs):
    '''
    Ensures that the named pod is present inside of the specified
    namespace with the given metadata and spec.
    If the pod exists it will be replaced.

    name
        The name of the pod.

    namespace
        The namespace holding the pod. The 'default' one is going to be
        used unless a different one is specified.

    metadata
        The metadata of the pod object.

    spec
        The spec of the pod object.

    source
        A file containing the definition of the pod (metadata and
        spec) in the official kubernetes format.

    template
        Template engine to be used to render the source file.
    '''
    ret = {'name': name,
           'changes': {},
           'result': False,
           'comment': ''}

    if (metadata or spec) and source:
        return _error(
            ret,
            '\'source\' cannot be used in combination with \'metadata\' or '
            '\'spec\''
        )

    if metadata is None:
        metadata = {}

    if spec is None:
        spec = {}

    pod = __salt__['metalk8s_kubernetes.show_pod'](name, namespace, **kwargs)

    if pod is None:
        if __opts__['test']:
            ret['result'] = None
            ret['comment'] = 'The pod is going to be created'
            return ret
        res = __salt__['metalk8s_kubernetes.create_pod'](name=name,
                                                namespace=namespace,
                                                metadata=metadata,
                                                spec=spec,
                                                source=source,
                                                template=template,
                                                saltenv=__env__,
                                                **kwargs)
        ret['changes']['{0}.{1}'.format(namespace, name)] = {
            'old': {},
            'new': res}
    else:
        if __opts__['test']:
            ret['result'] = None
            return ret

        # TODO: fix replace_namespaced_pod validation issues
        ret['comment'] = 'salt is currently unable to replace a pod without ' \
            'deleting it. Please perform the removal of the pod requiring ' \
            'the \'pod_absent\' state if this is the desired behaviour.'
        ret['result'] = False
        return ret

    ret['changes'] = {
        'metadata': metadata,
        'spec': spec
    }
    ret['result'] = True
    return ret


def node_label_absent(name, node, **kwargs):
    '''
    Ensures that the named label is absent from the node.

    name
        The name of the label

    node
        The name of the node
    '''

    ret = {'name': name,
           'changes': {},
           'result': False,
           'comment': ''}

    labels = __salt__['metalk8s_kubernetes.node_labels'](node, **kwargs)

    if name not in labels:
        ret['result'] = True if not __opts__['test'] else None
        ret['comment'] = 'The label does not exist'
        return ret

    if __opts__['test']:
        ret['comment'] = 'The label is going to be deleted'
        ret['result'] = None
        return ret

    __salt__['metalk8s_kubernetes.node_remove_label'](
        node_name=node,
        label_name=name,
        **kwargs)

    ret['result'] = True
    ret['changes'] = {
        'metalk8s_kubernetes.node_label': {
            'new': 'absent', 'old': 'present'}}
    ret['comment'] = 'Label removed from node'

    return ret


def node_label_folder_absent(name, node, **kwargs):
    '''
    Ensures the label folder doesn't exist on the specified node.

    name
        The name of label folder

    node
        The name of the node
    '''

    ret = {'name': name,
           'changes': {},
           'result': False,
           'comment': ''}
    labels = __salt__['metalk8s_kubernetes.node_labels'](node, **kwargs)

    folder = name.strip("/") + "/"
    labels_to_drop = []
    new_labels = []
    for label in labels:
        if label.startswith(folder):
            labels_to_drop.append(label)
        else:
            new_labels.append(label)

    if not labels_to_drop:
        ret['result'] = True if not __opts__['test'] else None
        ret['comment'] = 'The label folder does not exist'
        return ret

    if __opts__['test']:
        ret['comment'] = 'The label folder is going to be deleted'
        ret['result'] = None
        return ret

    for label in labels_to_drop:
        __salt__['metalk8s_kubernetes.node_remove_label'](
            node_name=node,
            label_name=label,
            **kwargs)

    ret['result'] = True
    ret['changes'] = {
        'metalk8s_kubernetes.node_label_folder_absent': {
            'old': list(labels),
            'new': new_labels,
        }
    }
    ret['comment'] = 'Label folder removed from node'

    return ret


def node_label_present(
        name,
        node,
        value,
        **kwargs):
    '''
    Ensures that the named label is set on the named node
    with the given value.
    If the label exists it will be replaced.

    name
        The name of the label.

    value
        Value of the label.

    node
        Node to change.
    '''
    ret = {'name': name,
           'changes': {},
           'result': False,
           'comment': ''}

    labels = __salt__['metalk8s_kubernetes.node_labels'](node, **kwargs)

    if name not in labels:
        if __opts__['test']:
            ret['result'] = None
            ret['comment'] = 'The label is going to be set'
            return ret
        __salt__['metalk8s_kubernetes.node_add_label'](label_name=name,
                                              label_value=value,
                                              node_name=node,
                                              **kwargs)
    elif labels[name] == value:
        ret['result'] = True
        ret['comment'] = 'The label is already set and has the specified value'
        return ret
    else:
        if __opts__['test']:
            ret['result'] = None
            ret['comment'] = 'The label is going to be updated'
            return ret

        ret['comment'] = 'The label is already set, changing the value'
        __salt__['metalk8s_kubernetes.node_add_label'](
            node_name=node,
            label_name=name,
            label_value=value,
            **kwargs)

    old_labels = copy.copy(labels)
    labels[name] = value

    ret['changes']['{0}.{1}'.format(node, name)] = {
        'old': old_labels,
        'new': labels}
    ret['result'] = True

    return ret


def node_annotation_absent(name, node, **kwargs):
    '''
    Ensures that the named annotation is absent from the node.

    name
        The name of the annotation

    node
        The name of the node
    '''

    ret = {'name': name,
           'changes': {},
           'result': False,
           'comment': ''}

    annotations = __salt__['metalk8s_kubernetes.node_annotations'](node, **kwargs)

    if name not in annotations:
        ret['result'] = True if not __opts__['test'] else None
        ret['comment'] = 'The annotation does not exist'
        return ret

    if __opts__['test']:
        ret['comment'] = 'The annotation is going to be deleted'
        ret['result'] = None
        return ret

    __salt__['metalk8s_kubernetes.node_remove_annotation'](
        node_name=node,
        annotation_name=name,
        **kwargs
    )

    ret['result'] = True
    ret['changes'] = {
        'metalk8s_kubernetes.node_annotation': {'new': 'absent', 'old': 'present'}
    }
    ret['comment'] = 'Annotation removed from node'

    return ret


def node_annotation_present(
        name,
        node,
        value,
        **kwargs):
    '''
    Ensures that the named annotation is set on the named node
    with the given value.
    If the annotation exists it will be replaced.

    name
        The name of the annotation.

    value
        Value of the annotation.

    node
        Node to change.
    '''
    ret = {'name': name,
           'changes': {},
           'result': False,
           'comment': ''}

    annotations = __salt__['metalk8s_kubernetes.node_annotations'](node, **kwargs)

    if name not in annotations:
        ret['comment'] = 'The annotation is going to be set'
        if __opts__['test']:
            ret['result'] = None
            return ret

        __salt__['metalk8s_kubernetes.node_add_annotation'](
            annotation_name=name,
            annotation_value=value,
            node_name=node,
            **kwargs
        )

    elif annotations[name] == value:
        ret['result'] = True
        ret['comment'] = (
            'The annotation is already set and has the specified value'
        )
        return ret

    else:
        if __opts__['test']:
            ret['result'] = None
            ret['comment'] = 'The annotation is going to be updated'
            return ret

        ret['comment'] = 'The annotation is already set, changing the value'

        __salt__['metalk8s_kubernetes.node_add_annotation'](
            node_name=node,
            annotation_name=name,
            annotation_value=value,
            **kwargs
        )

    old_annotations = copy.copy(annotations)
    annotations[name] = value

    ret['changes']['{0}.{1}'.format(node, name)] = {
        'old': old_annotations,
        'new': annotations}
    ret['result'] = True

    return ret


def node_taints_present(name, taints, **kwargs):
    ret = {'name': name,
           'changes': {},
           'result': False,
           'comment': ''}

    all_node_taints = __salt__['metalk8s_kubernetes.node_taints'](name, **kwargs)
    existing_taints = {t['key']: t for t in all_node_taints}

    added = set()
    updated = set()

    for taint in taints:
        key = taint['key']
        if key in existing_taints:
            if taint['effect'] != existing_taints[key]['effect']:
                updated.add(key)
        else:
            added.add(key)

    new_taints = [
        t for t in taints if t['key'] in (added | updated)
    ]
    new_taints.extend([
        t for key, t in existing_taints.items()
        if key not in (added | updated)
    ])

    ret['changes'] = {
        'old': list(existing_taints.values()),
        'new': new_taints,
    }
    ret['comment'] = '{} will change'.format(
        'Some taints' if (added | updated) else 'No taint'
    )

    if __opts__['test']:
        ret['result'] = None
        return ret

    __salt__['metalk8s_kubernetes.node_set_taints'](
        node_name=name,
        taints=new_taints,
        **kwargs
    )

    ret['result'] = True
    return ret


def serviceaccount_present(
        name,
        namespace='default',
        **kwargs):
    ret = {'name': name,
           'changes': {},
           'result': False,
           'comment': ''}

    serviceaccount = __salt__['metalk8s_kubernetes.show_serviceaccount'](name, namespace, **kwargs)

    if serviceaccount is None:
        if __opts__['test']:
            ret['result'] = None
            ret['comment'] = 'The serviceaccount is going to be created'
            return ret

        res = __salt__['metalk8s_kubernetes.create_serviceaccount'](name=name,
                                                           namespace=namespace,
                                                           **kwargs)
        ret['result'] = True
        ret['changes']['{0}.{1}'.format(namespace, name)] = {
            'old': {},
            'new': res}
    else:
        ret['result'] = True if not __opts__['test'] else None
        ret['comment'] = 'The serviceaccount already exists'

    return ret


def clusterrolebinding_present(
        name,
        role_ref,
        subjects,
        **kwargs):
    ret = {'name': name,
           'changes': {},
           'result': False,
           'comment': ''}

    clusterrolebinding = __salt__['metalk8s_kubernetes.show_clusterrolebinding'](name, **kwargs)

    if clusterrolebinding is None:
        if __opts__['test']:
            ret['result'] = None
            ret['comment'] = 'The clusterrolebinding is going to be created'
            return ret

        res = __salt__['metalk8s_kubernetes.create_clusterrolebinding'](name=name,
                                                               role_ref=role_ref,
                                                               subjects=subjects,
                                                               **kwargs)
        ret['result'] = True
        ret['changes'][name] = {
            'old': {},
            'new': res}
    else:
        if __opts__['test']:
            ret['result'] = None
            ret['comment'] = 'The clusterrolebinding is going to be replaced'
            return ret

        # TODO: improve checks  # pylint: disable=fixme
        log.info('Forcing the recreation of the clusterrolebinding')
        ret['comment'] = 'The clusterrolebinding is already present. Forcing recreation'
        res = __salt__['metalk8s_kubernetes.replace_clusterrolebinding'](
            name=name,
            role_ref=role_ref,
            subjects=subjects,
            **kwargs)

        ret['result'] = True
        ret['changes'][name] = {
            'old': clusterrolebinding,
            'new': res}

    return ret


def role_present(
        name,
        namespace,
        rules,
        **kwargs):
    ret = {'name': name,
           'changes': {},
           'result': False,
           'comment': ''}

    role = __salt__['metalk8s_kubernetes.show_role'](name, namespace, **kwargs)

    if role is None:
        if __opts__['test']:
            ret['result'] = None
            ret['comment'] = 'The role is going to be created'
            return ret

        res = __salt__['metalk8s_kubernetes.create_role'](name=name,
                                                 namespace=namespace,
                                                 rules=rules,
                                                 **kwargs)
        ret['result'] = True
        ret['changes']['{0}.{1}'.format(namespace, name)] = {
            'old': {},
            'new': res}
    else:
        if __opts__['test']:
            ret['result'] = None
            ret['comment'] = 'The role is going to be replaced'
            return ret

        # TODO: improve checks  # pylint: disable=fixme
        log.info('Forcing the recreation of the role')
        ret['comment'] = 'The role is already present. Forcing recreation'
        res = __salt__['metalk8s_kubernetes.replace_role'](
            name=name,
            namespace=namespace,
            rules=rules,
            **kwargs)

        ret['result'] = True
        ret['changes']['{0}.{1}'.format(namespace, name)] = {
            'old': role,
            'new': res}

    return ret


def rolebinding_present(
        name,
        namespace,
        role_ref,
        subjects,
        **kwargs):
    ret = {'name': name,
           'changes': {},
           'result': False,
           'comment': ''}

    rolebinding = __salt__['metalk8s_kubernetes.show_rolebinding'](name, namespace, **kwargs)

    if rolebinding is None:
        if __opts__['test']:
            ret['result'] = None
            ret['comment'] = 'The rolebinding is going to be created'
            return ret

        res = __salt__['metalk8s_kubernetes.create_rolebinding'](name=name,
                                                        namespace=namespace,
                                                        role_ref=role_ref,
                                                        subjects=subjects,
                                                        **kwargs)
        ret['result'] = True
        ret['changes']['{0}.{1}'.format(namespace, name)] = {
            'old': {},
            'new': res}
    else:
        if __opts__['test']:
            ret['result'] = None
            ret['comment'] = 'The rolebinding is going to be replaced'
            return ret

        # TODO: improve checks  # pylint: disable=fixme
        log.info('Forcing the recreation of the rolebinding')
        ret['comment'] = 'The rolebinding is already present. Forcing recreation'
        res = __salt__['metalk8s_kubernetes.replace_rolebinding'](
            name=name,
            namespace=namespace,
            role_ref=role_ref,
            subjects=subjects,
            **kwargs)

        ret['result'] = True
        ret['changes']['{0}.{1}'.format(namespace, name)] = {
            'old': rolebinding,
            'new': res}

    return ret


def daemonset_present(
        name,
        namespace,
        metadata,
        spec,
        **kwargs):
    ret = {'name': name,
           'changes': {},
           'result': False,
           'comment': ''}

    daemonset = __salt__['metalk8s_kubernetes.show_daemonset'](name, namespace, **kwargs)

    if daemonset is None:
        if __opts__['test']:
            ret['result'] = None
            ret['comment'] = 'The daemonset is going to be created'
            return ret

        res = __salt__['metalk8s_kubernetes.create_daemonset'](name=name,
                                                      namespace=namespace,
                                                      metadata=metadata,
                                                      spec=spec,
                                                      **kwargs)
        ret['result'] = True
        ret['changes']['{0}.{1}'.format(namespace, name)] = {
            'old': {},
            'new': res}
    else:
        if __opts__['test']:
            ret['result'] = None
            ret['comment'] = 'The daemonset is going to be replaced'
            return ret

        # TODO: improve checks  # pylint: disable=fixme
        log.info('Forcing the recreation of the daemonset')
        ret['comment'] = 'The daemonset is already present. Forcing recreation'
        res = __salt__['metalk8s_kubernetes.replace_daemonset'](
            name=name,
            namespace=namespace,
            metadata=metadata,
            spec=spec,
            **kwargs)

        ret['result'] = True
        ret['changes']['{0}.{1}'.format(namespace, name)] = {
            'old': daemonset,
            'new': res}

    return ret

def clusterrole_present(
        name,
        rules,
        **kwargs):
    ret = {'name': name,
           'changes': {},
           'result': False,
           'comment': ''}

    clusterrole = __salt__['metalk8s_kubernetes.show_clusterrole'](name, **kwargs)

    if clusterrole is None:
        if __opts__['test']:
            ret['result'] = None
            ret['comment'] = 'The clusterrole is going to be created'
            return ret

        res = __salt__['metalk8s_kubernetes.create_clusterrole'](
            name=name,
            rules=rules,
            **kwargs)
        ret['result'] = True
        ret['changes'][name] = {
            'old': {},
            'new': res}
    else:
        if __opts__['test']:
            ret['result'] = None
            ret['comment'] = 'The clusterrole is going to be replaced'
            return ret

        # TODO: improve checks  # pylint: disable=fixme
        log.info('Forcing the recreation of the clusterrole')
        ret['comment'] = 'The clusterrole is already present. Forcing recreation'
        res = __salt__['metalk8s_kubernetes.replace_clusterrole'](
            name=name,
            rules=rules,
            **kwargs)

        ret['result'] = True
        ret['changes'][name] = {
            'old': clusterrole,
            'new': res}

    return ret


def customresourcedefinition_present(
        name,
        spec,
        **kwargs):
    ret = {'name': name,
           'changes': {},
           'result': False,
           'comment': ''}

    customresourcedefinition = __salt__[
        'metalk8s_kubernetes.show_customresourcedefinition'](name, **kwargs)

    if customresourcedefinition is None:
        if __opts__['test']:
            ret['result'] = None
            ret['comment'] = 'The customresourcedefinition is going to be created'
            return ret

        res = __salt__['metalk8s_kubernetes.create_customresourcedefinition'](
            name=name,
            spec=spec,
            **kwargs)
        ret['result'] = True
        ret['changes'][name] = {
            'old': {},
            'new': res}
    else:
        if __opts__['test']:
            ret['result'] = None
            ret['comment'] = 'The customresourcedefinition is going to be replaced'
            return ret

        # TODO: improve checks  # pylint: disable=fixme
        log.info('Forcing the recreation of the customresourcedefinition')
        ret['comment'] = 'The custonresourcedefinition is already present. Forcing recreation'
        res = __salt__['metalk8s_kubernetes.replace_customresourcedefinition'](
            name=name,
            spec=spec,
            old_crd=customresourcedefinition,
            **kwargs)

        ret['result'] = True
        ret['changes'][name] = {
            'old': customresourcedefinition,
            'new': res}

    return ret


def _extract_custom_resource_data(name, namespace, body, source, **kwargs):
    if body and source:
        raise ValueError("'source' cannot be used in combination with 'body'")

    if source:
        try:
            with open(source, 'r') as source_file:
                body = yaml.safe_load(source_file)
        except IOError as exc:
            raise ValueError("no such '{0}' source file".format(source))

    try:
        kind = body['kind']
    except KeyError:
        raise ValueError("object 'kind' is missing in object definition")

    try:
        group, version = body.get('apiVersion', '').split('/')
    except ValueError:
        raise ValueError(
            "malformed or undefined 'apiVersion' in object definition"
        )

    plural = __salt__['metalk8s_kubernetes.get_crd_plural_from_kind'](
        kind, **kwargs)
    if plural is None:
        raise ValueError(
            "Unable to find plural of '{0}' kind, the associated custom "
            "resource definition may not exist".format(kind)
        )

    old_custom_resource = \
        __salt__['metalk8s_kubernetes.show_namespaced_custom_object'](
            group, version, namespace, plural, name, **kwargs
        )

    return {
        'plural': plural,
        'group': group,
        'version': version,
        'body': body,
        'old': old_custom_resource,
    }


def customresource_present(
        name,
        namespace='default',
        body=None,
        source=None,
        **kwargs):
    '''
    Ensures that the custom resource is present inside of the specified
    namespace with the given body.
    If the custom resource already exists, it will be updated.

    name
        The name of the custom resource.

    namespace
        The namespace holding the custom resource. The 'default' one is going
        to be used, unless a different one is specified.

    body
        The definition of the custom resource as a python dict.

    source
        A file containing the definition of the custom resource in the official
        kubernetes format.
    '''

    ret = {
        'name': name,
        'changes': {},
        'result': False,
        'comment': ''
    }

    try:
        cr_data = _extract_custom_resource_data(
            name, namespace, body, source, **kwargs
        )
    except ValueError as exc:
        return _error(ret, exc.message)

    cr_full_name = '{0}.{1}.{2}'.format(namespace, cr_data['plural'], name)

    if cr_data['old'] is None:
        if __opts__['test']:
            ret['result'] = None
            ret['comment'] = 'The custom resource is going to be created'
            return ret

        res = __salt__['metalk8s_kubernetes.create_namespaced_custom_object'](
            cr_data['group'], cr_data['version'], namespace,
            cr_data['plural'], cr_data['body'], **kwargs
        )

        if res is None:
            return ret

        ret['changes'][cr_full_name] = {
            'old': {},
            'new': res,
        }
    else:
        if __opts__['test']:
            ret['result'] = None
            return ret

        ret['comment'] = \
            'The custom resource is already present, updating resource.'
        res = __salt__['metalk8s_kubernetes.replace_namespaced_custom_object'](
            cr_data['group'], cr_data['version'], namespace, cr_data['plural'],
            name, cr_data['body'], cr_data['old'], **kwargs
        )

        if res is None:
            return ret

        ret['changes'][cr_full_name] = \
            salt.utils.dictdiffer.deep_diff(cr_data['old'], res)

    ret['result'] = True
    return ret


def customresource_absent(
        name,
        namespace='default',
        body=None,
        source=None,
        **kwargs):
    '''
    Ensures that the named custom resource is absent from the given namespace.

    name
        The name of the custom resource.

    namespace
        The namespace holding the custom resource. The 'default' one is going
        to be used, unless a different one is specified.

    body
        The definition of the custom resource as a python dict.

    source
        A file containing the definition of the custom resource in the official
        kubernetes format.
    '''

    ret = {
        'name': name,
        'changes': {},
        'result': False,
        'comment': ''
    }

    try:
        cr_data = _extract_custom_resource_data(
            name, namespace, body, source, **kwargs
        )
    except ValueError as exc:
        return _error(ret, exc.message)

    if cr_data['old'] is None:
        ret['result'] = True if not __opts__['test'] else None
        ret['comment'] = 'The custom resource does not exist'
        return ret

    if __opts__['test']:
        ret['result'] = None
        ret['comment'] = 'The custom resource is going to be deleted'
        return ret

    res = __salt__['metalk8s_kubernetes.delete_namespaced_custom_object'](
        cr_data['group'], cr_data['version'], namespace,
        cr_data['plural'], name, **kwargs
    )

    cr_full_name = '{0}.{1}.{2}'.format(namespace, cr_data['plural'], name)

    if res is None:
        return ret

    ret['result'] = True
    ret['changes'] = {
        cr_full_name: {
            'new': 'absent',
            'old': 'present',
        }
    }

    return ret
