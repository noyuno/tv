# ディスク

## 設定

/etc/security/pwquality.conf
~~~
dictcheck=0
~~~

## 作成

### hddsg0

~~~
sudo gdisk /dev/sdf
> o y
> n 8e00
cryptsetup benchmark
~~~

~~~
sudo vgcreate hddsg0 /dev/sdb1
sudo lvcreate -L 4T /dev/mapper/hddsg0 -n data0
sudo lvcreate -L 1T /dev/mapper/hddsg0 -n crypt0
sudo mkfs.xfs /dev/mapper/hddsg0-data0
sudo cryptsetup luksFormat -c aes-xts-plain64 -s 512 /dev/mapper/hddsg0-crypt0
sudo cryptsetup open /dev/mapper/hddsg0-crypt0 hddsg0-crypt0-data
sudo mkfs.xfs /dev/mapper/hddsg0-crypt0-data

sudo mkdir /mnt/hddsg0-data0
sudo mount /dev/mapper/hddsg0-data0 /mnt/hddsg0-data0
sudo mkdir /mnt/hddsg0-crypt0
sudo mount /dev/mapper/hddsg0-crypt0-data /mnt/hddsg0-crypt0
~~~

### hddsg2

~~~
sudo gdisk /dev/sdf
> o y
> n 8e00
cryptsetup benchmark
~~~

~~~
sudo pvcreate /dev/sdf1
sudo vgcreate hddsg2 /dev/sdf1
sudo lvcreate -L 4T /dev/mapper/hddsg2 -n data0
sudo lvcreate -L 1T /dev/mapper/hddsg2 -n crypt0
sudo mkfs.xfs /dev/mapper/hddsg2-data0
sudo cryptsetup luksFormat -c aes-xts-plain64 -s 512 /dev/mapper/hddsg2-crypt0
sudo cryptsetup open /dev/mapper/hddsg2-crypt0 hddsg2-crypt0-data
sudo mkfs.xfs /dev/mapper/hddsg2-crypt0-data

sudo mkdir /mnt/hddsg2-data0
sudo mount /dev/mapper/hddsg2-data0 /mnt/hddsg2-data0
sudo mkdir /mnt/hddsg2-crypt0
sudo mount /dev/mapper/hddsg2-crypt0-data /mnt/hddsg2-crypt0
~~~

## ファイルコピー

~~~
sudo rsync -av /mnt/hdd/ /mnt/hddsg0-data
~~~

## バックアップ

~~~
sudo ./tv/backup.sh -sh
~~~

## リストア

/はxfsrestore、/bootはrestore、/boot/efiはtarを使って復元する。

また、`/etc/default/grub`のLVMの部分を修正する。

## パフォーマンス測定

ThinPoolは遅すぎ（40MB/s程度）。特に動的割り当てに時間かかる。ThinPoolでなかったら170MB/s程度出る。

### シーケンシャルライト速度

~~~
dd if=/dev/zero of=/mnt/hddsg0-data/test bs=1M count=1024 oflag=direct
~~~

### キャッシュ

[Linuxページキャッシュの設定を変更してWrite I/Oをチューニングしたメモ - YOMON8.NET](https://yomon.hatenablog.com/entry/2017/04/01/131732)

### rsync ハードリンク

オプションに`--no-inc-recursive`を指定していればハードリンクもファイルの内容をコピーすることなく効率よくコピーできる。

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
/dev/mapper/hddtd0-data0  /mnt/hddtd0-data0        xfs     defaults,nofail        0 0
/dev/mapper/hddsg0-data0  /mnt/hddsg0-data0        xfs     defaults,nofail        0 0
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
