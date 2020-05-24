# 実験環境

## 1. 仕様

- CentOS 8 の実験環境をKVMで構築

## 2. インストール

~~~
virt-install --name e11 --hvm --arch x86_64 --os-type linux --os-variant centos7.0 --vcpus 4 --ram 4096 --disk path=/mnt/data/vm/e11/root.qcow2,format=qcow2,size=32 --network bridge=br0 --graphics vnc,keymap=us --noautoconsole --location /mnt/hdd/vm/fs/CentOS-8.1.1911-x86_64-dvd1.iso --extra-args ro
~~~

## 3. ゲスト側でインストール

~~~
sudo dnf -y install https://dl.fedoraproject.org/pub/epel/epel-release-latest-8.noarch.rpm
sudo dnf -y update
sudo dnf -y install git tmux zsh podman-docker htop tigervnc
sudo pip3 install podman-compose
sudo firewall-cmd --add-service=vnc-server --permanent
sudo firewall-cmd --reload
~~~