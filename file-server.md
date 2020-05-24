# ファイルサーバ

## 1. 仕様

1. CentOS 8 ホスト
2. CentOS 8 ゲスト (インスタンス名：fs)
3. KVM
4. ゲストのディスクはdm-cryptで暗号化する。
5. Samba

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

## 2.2. Cockpitのrootでのログインを阻止する。

`/etc/pam.d/cockpit`の最初の行に入力
~~~
auth requisite pam_succeed_if.so uid >= 1000
~~~

~~~
sudo systemctl restart cockpit.socket
~~~

## 2.3. 一般ユーザでも仮想マシンを操作できるようにする

c.f. [virt-managerをroot以外の一般ユーザーで使う | 普段使いのArch Linux](https://www.archlinux.site/2016/05/virt-managerroot.html)


## 3. ネットワーク

~~~
sudo nmcli con add type bridge con-name br0 ifname br0
sudo nmcli con mod br0 bridge.stp no
sudo nmcli con mod br0 ipv4.method manual ipv4.addresses "192.168.100.222/24" ipv4.gateway "192.168.100.1" ipv4.dns "192.168.100.1"
sudo nmcli con mod br0 autoconnect yes
sudo nmcli con add type bridge-slave ifname eno1 master br0
sudo nmcli c up br0
sudo firewall-cmd --zone=internal --change-interface=br0
~~~

/etc/qemu-kvm/bridge.conf
~~~
allow br0
~~~

~~~
sudo nmcli c del eno1
~~~

SSHが切断される。

## 4. CentOS 8をインストールする

***host***

ISO をダウンロードする

`/mnt/hdd/vm/fs` 以下にシステムとデータ両方を保存する

~~~
sudo mkdir -p /mnt/hdd/vm/fs
sudo chown -R noyuno.noyuno $_
cd $_

virt-install --name fs --hvm --arch x86_64 --os-type linux --os-variant centos7.0 --vcpus 2 --ram 2048 --disk path=/mnt/hdd/vm/fs/root.qcow2,format=qcow2,size=250 --network bridge=br0 --graphics vnc,keymap=us --noautoconsole --location CentOS-8.1.1911-x86_64-dvd1.iso --extra-args ro
~~~

メモリが１GBだとインストール途中でフリーズする。

***guest***

- パーティション: なにもいじらないこと！いじると起動しない恐れあり
- ネットワーク: static, 192.168.100.223/24, DNS=8.8.8.8　通信できないときは再起動して一からやり直す
- ソフトの選択画面: 基本？みたいなやつを選ぶ
- 一般ユーザの詳細設定画面を開くとフリーズするので開かないこと！

## 5. ゲストOSを設定する

### 5.1. ディスク構成の変更

(インストールディスクを接続して起動。)

***install media->rescue***

スワップパーティション・ホームパーティションを削除

~~~
chroot /mnt/sysimage
swapoff /dev/dm-2
lvremove /dev/cl_v1/swap-1
umount /dev/cl_v1/home
lvremove /dev/cl_v1/home
lvresize -l+100%FREE -r /dev/cl_v1/root
df -h
# /etc/fstab を編集
# /etc/default/grub を編集
reboot
~~~

### 5.2. ユーザ再作成

***root@guest***

~~~
adduser -Gwheel -m noyuno
passwd noyuno
~~~

visudo
~~~
Defaults timestamp_timeout = 30
~~~

### 6. ソフトウェアのインストール

~~~
sudo dnf -y install https://dl.fedoraproject.org/pub/epel/epel-release-latest-8.noarch.rpm
sudo dnf -y update
sudo dnf -y install git tmux zsh tar htop samba samba-client avahi
git clone https://github.com/noyuno/tv
git submodule update --init --recursive
bash dots/install
sudo lchsh noyuno
~~~


## 7. Samba

/etc/samba/smb.conf
~~~
[global]
    dos charset = CP932
    unix charset = UTF-8
    workgroup = WORKGROUP
    server string = CentOS 8 Encrypted File Server
    hosts allow = 192.168.100. 192.168.5. localhost EXCEPT 192.168.100.1
    netbios name = v1
    dns proxy = no
    security = user
    map to guest = bad user
    printing = bsd
    printcap name = /dev/null
    local master = yes
    os level = 200
    browseable = yes
    min protocol = SMB2
    max protocol = SMB3
    unix extensions = no
    wide links = yes

[share]
    path = /var/samba/share
    browsable = yes
    writable = yes
    guest ok = no
    read only = no
    create mode = 0777
    directory mode = 0777
~~~

~~~
sudo mkdir -p /var/samba/share
sudo chown noyuno.noyuno $_
sudo systemctl enable --now smb nmb
sudo systemctl status smb nmb

sudo pdbedit -a noyuno
sudo pdbedit -L
~~~

~~~
[noyuno@v1 ~] $ ls -la /var/samba/share
total 0
drwxr-xr-x. 2 noyuno noyuno  6 May 13 22:03 .
drwxr-xr-x. 3 root   root   19 May 13 22:03 ..
~~~

Windows+R type `\\v1\` to connect

## 8. セキュリティの設定

## 8.1. firewalld

~~~
sudo firewall-cmd --permanent --zone=public --add-service=samba
sudo firewall-cmd --reload
~~~

## 8.2. SELinux

~~~
sudo setenforce 0
sudo nano /etc/sysconfig/selinux
~~~

~~~
SELINUX=disabled
~~~

## 9. GitBucket

~~~
sudo dnf -y install java-11-openjdk
sudo mkdir /var/gitbucket
sudo chown noyuno.noyuno $_
cd $_
curl -sLo gitbucket.war https://github.com/gitbucket/gitbucket/releases/download/4.33.0/gitbucket.war
mkdir data
GITBUCKET_HOME=/var/gitbucket/data sudo java -jar gitbucket.war --port=80
~~~

/etc/systemd/system/gitbucket.service

~~~
[Unit]
Description=GitBucket service

[Service]
WorkingDirectory=/var/gitbucket
Environment=GITBUCKET_HOME=/var/gitbucket/data
ExecStart=/usr/bin/java -jar gitbucket.war --port=80
User=root

[Install]
WantedBy=multi-user.target
~~~

~~~
sudo systemctl daemon-reload
sudo systemctl enable --now gitbucket
~~~

## 9. 調整

最大メモリを調整する。インストール時は２GBないとクラッシュしたが、運用中はSambaだけなら500MBでも十分。GitBucketを動かすなら2GB必須。

~~~
virsh shutdown fs
virsh setmaxmem fs 500M
virsh start fs
virsh autostart fs
~~~

# トラブルシューティング

## 1. インストール中に"DNF error: Error in POSTTRANS scriptlet in rpm package kernel-core"



# 参考

## 1. ファイル名のバイト数を調べる

~~~
find . -type f | sed 's|.*/||' | while read line ; do echo "$line" | wc -c ; done > /tmp/length
find . -type f > /tmp/files
paste /tmp/length /tmp/files | sort -n
~~~
