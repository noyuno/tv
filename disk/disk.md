# ディスク

## 設定

/etc/security/pwquality.conf
~~~
dictcheck=0
~~~

## 作成

### hddsg0

~~~
sudo gdisk /dev/sdc
> o y
> n 8e00
cryptsetup benchmark
~~~

~~~
sudo vgcreate hddsg0 /dev/sda1
sudo lvcreate -L 4T /dev/mapper/hddsg0 -n data
sudo lvcreate -L 1T /dev/mapper/hddsg0 -n crypt
sudo mkfs.xfs /dev/hddsg0/data
sudo cryptsetup luksFormat -c aes-xts-plain64 -s 512 /dev/hddsg0/crypt
sudo cryptsetup open /dev/mapper/hddsg0-crypt hddsg0-crypt-data
sudo mkfs.xfs /dev/mapper/hddsg0-crypt-data

sudo mkdir /mnt/hddsg0-data
sudo mount /dev/hddsg0/data /mnt/hddsg0-data
sudo mkdir /mnt/hddsg0-crypt
sudo mount /dev/mapper/hddsg0-crypt-data /mnt/hddsg0-crypt
sudo chown noyuno.noyuno /mnt/hddsg0-crypt/private
~~~

### hddsg1

~~~
sudo gdisk /dev/sdc
> o y
> n 8e00
cryptsetup benchmark
~~~

~~~
sudo pvcreate /dev/sdc1
sudo vgcreate hddsg1 /dev/sdc1
sudo lvcreate -L 4T /dev/mapper/hddsg1 -n data0
sudo lvcreate -L 1T /dev/mapper/hddsg1 -n crypt0
sudo mkfs.xfs /dev/mapper/hddsg1-data0
sudo cryptsetup luksFormat -c aes-xts-plain64 -s 512 /dev/mapper/hddsg1-crypt0
sudo cryptsetup open /dev/mapper/hddsg1-crypt0 hddsg1-crypt0-data
sudo mkfs.xfs /dev/mapper/hddsg1-crypt0-data

sudo mkdir /mnt/hddsg1-data0
sudo mount /dev/mapper/hddsg1-data0 /mnt/hddsg1-data0
sudo mkdir /mnt/hddsg1-crypt0
sudo mount /dev/mapper/hddsg1-crypt0-data /mnt/hddsg1-crypt0
~~~

## ファイルコピー

~~~
sudo rsync -av /mnt/hdd/ /mnt/hddsg0-data
~~~

## バックアップ

~~~
sudo ./tv/backup.sh
~~~

## パフォーマンス測定

### シーケンシャルライト速度

~~~
dd if=/dev/zero of=/mnt/hddsg0-data/test bs=1M count=1024 oflag=direct
~~~

### キャッシュ

[Linuxページキャッシュの設定を変更してWrite I/Oをチューニングしたメモ - YOMON8.NET](https://yomon.hatenablog.com/entry/2017/04/01/131732)


## Samba


Windows 10， iOS Infuseで閲覧

~~~
sudo nano /etc/fstab
~~~

~~~
/dev/mapper/cl_m1-r      /                       xfs     defaults        0 0
UUID=c1f041e1-2233-436f-a486-c2db9040482d /boot  ext4    defaults        1 2
UUID=2971-857F           /boot/efi               vfat    umask=0077,shortname=winnt 0 2
/dev/mapper/cl_m1-data   /mnt/data               xfs     defaults        0 0
/dev/mapper/cl_m1-vm     /mnt/vm                 xfs     defaults        0 0
/dev/mapper/hddsg0-data  /mnt/hddsg0-data        xfs     defaults        0 0
~~~

~~~
sudo cp smb.conf /etc/samba/smb.conf

~~~

~~~
sudo mkdir -p /mnt/data/share/tv
cd /mnt/data/share/tv
ln -sfnv /mnt/data/ts m2-ts
ln -sfnv /mnt/hddsg0-data0/mp4 hdd-mp4

sudo systemctl enable --now smb nmb

sudo pdbedit -a noyuno
sudo pdbedit -L
~~~

Windows+R type `\\m1\` to connect
