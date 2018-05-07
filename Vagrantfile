Vagrant.configure("2") do |config|
  config.vm.box = "metal-k8s"
  config.vm.box_url = "file://./builds/virtualbox-metal-k8s.box"
  #config.vm.box_download_checksum = ""
  #config.vm.box_download_checksum_type = "sha256"

  [80, 443, 6443].each do |port|
    config.vm.network "forwarded_port", guest: port, host: 10000 + port, host_ip: "127.0.0.1"
  end

  config.vm.post_up_message = <<-EOS
Your MetalK8s node is now running

Dashboard: https://127.0.0.1:16443/ui
  Authentication type: Basic
  Username: kube
  Password: insecure

Metrics (Grafana): http://127.0.0.1:10080/_/grafana
Alerts (Prometheus): http://127.0.0.1:10080/_/alertmanager

Note: it may take some time before these services are accessible.

To use `kubectl` and `helm`, run

  $ export KUBECONFIG=$(pwd)/contrib/packer/admin.conf

in your environment
EOS
end
