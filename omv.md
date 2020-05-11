# OpenMediaVault をインストールする

## 仕様

1. CentOS 8 host
2. KVM
3. qcow2 encryption
4. OpenMediaVault

## 2. インストール

[KVMによる仮想基盤サーバの構築と仮想マシンの作成 (CnetOS 8) | 電算星組](https://densan-hoshigumi.com/server/centos8-kvm-install)
を参照

~~~
sudo dnf -y module install virt
sudo dnf -y install virt-install cockpit cockpit-machines
~~~

/etc/default/grub
~~~
GRUB_CMDLINE_LINUX="rd.lvm.lv=cl_m1/r intel_iommu=on"
~~~

~~~
sudo grub2-mkconfig -o /boot/efi/EFI/centos/grub.cfg
sudo reboot
~~~

~~~
virt-host-validate
sudo systemctl enable --now libvirtd cockpit.socket
sudo systemctl status libvirtd cockpit.socket
~~~

## 3. ネットワーク

~~~
sudo nmcli con add type bridge con-name br0 ifname br0
sudo nmcli con mod br0 bridge.stp no
sudo nmcli con mod br0 ipv4.method manual ipv4.addresses "192.168.100.223/24" ipv4.gateway "192.168.100.1" ipv4.dns 8.8.8.8
sudo nmcli con mod br0 autoconnect yes
sudo nmcli con add type bridge-slave ifname eno1 master br0
sudo nmcli c up br0
~~~

