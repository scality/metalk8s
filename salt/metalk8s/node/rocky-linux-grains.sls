{#- Ugly workaround waiting for Rocky Linux support in Salt #}
{%- if grains.get("os_family") == "Rocky" %}

Set os_family grain:
  grains.present:
    - name: os_family
    - value: RedHat

{%- else %}

Not a Rocky Linux host, no os_family grain to set:
  test.nop

{%- endif %}

{%- if grains.get("os") == "Rocky" %}

Set os grain:
  grains.present:
    - name: os
    - value: CentOS

{%- else %}

Not a Rocky Linux host, no os grain to set:
  test.nop

{%- endif %}
