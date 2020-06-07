# ディスク

## 設定

/etc/security/pwquality.conf
~~~
dictcheck=0
~~~

## 作成

### hddsg0

~~~
sudo vgcreate hddsg0 /dev/sda
sudo lvcreate -l 100%FREE -T /dev/mapper/hddsg0/thin0
sudo lvcreate -V 16T -T /dev/mapper/hddsg0-thin0 -n data
sudo lvcreate -V 16T -T /dev/mapper/hddsg0-thin0 -n crypt
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
sudo vgcreate hddsg1 /dev/sdc
sudo lvcreate -l 100%FREE -T /dev/mapper/hddsg1/thin0
sudo lvcreate -V 16T -T /dev/mapper/hddsg1-thin0 -n data
sudo lvcreate -V 16T -T /dev/mapper/hddsg1-thin0 -n crypt
sudo mkfs.xfs /dev/mapper/hddsg1-data
sudo cryptsetup luksFormat -c aes-xts-plain64 -s 512 /dev/hddsg1/crypt
sudo cryptsetup open /dev/mapper/hddsg1-crypt hddsg1-crypt-data
sudo mkfs.xfs /dev/mapper/hddsg1-crypt-data

sudo mkdir /mnt/hddsg1-data
sudo mount /dev/mapper/hddsg1-data /mnt/hddsg1-data
sudo mkdir /mnt/hddsg1-crypt
sudo mount /dev/mapper/hddsg1-crypt-data /mnt/hddsg1-crypt
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

~~~
dd if=/dev/zero of=/mnt/hddsg0-data/test bs=1M count=1024 oflag=direct
~~~
