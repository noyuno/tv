#!/bin/bash

set -e

hddsrc=hddsg0
hdddest=hddsg1
data=data0
crypt=crypt0
rsyncopt='-auhH --delete --info=progress2 --exclude=.history --rsync-path="ionice -c3 nice -n 10 rsync" --bwlimit=51200'
source /home/noyuno/tv/.env

while getopts shiv opt; do
  case $opt in
    s) backup_system=1 ;;
    h) backup_home=1 ;;
    v) verbose=-v
       rsyncopt="$rsyncopt -v"
       set -x ;;
  esac
done

# 1. mount
echo -e '\x1b[38;05;2mStep 1: Mounting filesystem\e[0m'

read -sp "Enter passphrase for /dev/mapper/$hddsrc-$crypt and /dev/mapper/$hdddest-$crypt: " pass
tty -s && echo

is_mounted() {
  dev=$1
  mpoint=$2
  if [ ! "$mpoint" ]; then
    mpoint=$dev
  fi
  mount | grep ^/dev/mapper/$dev\ on\ /mnt/$mpoint\ type\ xfs || echo ''
}

# [Linuxページキャッシュの設定を変更してWrite I/Oをチューニングしたメモ - YOMON8.NET](https://yomon.hatenablog.com/entry/2017/04/01/131732)
# server implemented memory: 12GB
# 2% = 120MB
# dirty_expire_centisecs = 1.00 sec
sudo sysctl -w vm.dirty_background_ratio=1 # default 10
sudo sysctl -w vm.dirty_ratio=2 # default 40
sudo sysctl -w vm.dirty_expire_centisecs=100 # default 500

mounted_src_data="$(is_mounted $hddsrc-$data)"
mounted_dest_data="$(is_mounted $hdddest-$data)"
mounted_src_crypt="$(is_mounted $hddsrc-$crypt-data $hddsrc-$crypt)"
mounted_dest_crypt="$(is_mounted $hdddest-$crypt-data $hdddest-$crypt)"

# bug fix
if [ ! "$mounted_src_data" -a ! "$mounted_src_crypt" ]; then
  lvchange -an $hddsrc/$data
  lvchange -an $hddsrc/$crypt
  vgchange -an $hddsrc
  vgchange -ay $hddsrc
  lvchange -ay $hddsrc/$data
  lvchange -ay $hddsrc/$crypt
fi
if [ ! "$mounted_dest_data" -a ! "$mounted_dest_crypt" ]; then
  lvchange -an $hdddest/$data
  lvchange -an $hdddest/$crypt
  vgchange -an $hdddest
  vgchange -ay $hdddest
  lvchange -ay $hdddest/$data
  lvchange -ay $hdddest/$crypt
fi

mount_lv() {
  dev=$1
  mpoint=$2
  if [ ! "$mpoint" ]; then
    mpoint=$dev
  fi
  mkdir -p /mnt/$mpoint
  mount /dev/mapper/$dev /mnt/$mpoint
}

[ ! "$mounted_src_data" ] &&   mount_lv $hddsrc-$data
[ ! "$mounted_dest_data" ] &&  mount_lv $hdddest-$data
[ ! "$mounted_src_crypt" ] &&  mount_lv $hddsrc-$crypt-data $hddsrc-$crypt
[ ! "$mounted_dest_crypt" ] && mount_lv $hdddest-$crypt-data $hdddest-$crypt

# 2. system
if [ "$backup_system" ]; then
  echo -e '\x1b[38;05;2mStep 2: Backup system\e[0m'

  mkdir -p /mnt/$hddsrc-$data/backup/system
  pushd $_
  fdisk -l /dev/nvme0n1 >fdisk
  gdisk -l /dev/nvme0n1 > gdisk
  df -h > df
  cp /etc/fstab fstab
  pvdisplay > pvdisplay
  vgdisplay > vgdisplay
  lvdisplay > lvdisplay
  sudo nmcli > nmcli
  firewall-cmd --list-all-zones > firewall-all-zones
  sync
  tar czf efi-vfat.tar.gz /boot/efi
  dump -0 -f boot-ext4dump.gz /dev/nvme0n1p2
  xfsdump -v silent -l 0 - /dev/cl_m1/r | nice -n 10 pigz > root-xfsdump.gz
  popd
fi

# 3. home
if [ "$backup_home" ]; then
  echo -e '\x1b[38;05;2mStep 3: Backup home\e[0m'

  homedest=/mnt/$hddsrc-$data/backup/home
  mkdir -p $homedest

  # home dir
  pushd /home/noyuno
  tar -cp . | pigz > $homedest/home.tar.gz
  popd

  # database
  mysqldump -unoyuno -p$EPGSTATION_DB_PASS --single-transaction epgstation | nice -n 10 pigz > $homedest/epgstation-mysql.gz
fi

# 4. USB HDD data
echo -e '\x1b[38;05;2mStep 4: Syncing HDD\e[0m'

rsync $rsyncopt /mnt/$hddsrc-$data/ /mnt/$hdddest-$data
rsync $rsyncopt /mnt/$hddsrc-$crypt/ /mnt/$hdddest-$crypt

# 5. umount
echo -e '\x1b[38;05;2mStep 5: Unmounting filesystem\e[0m'

sync
umount /dev/mapper/$hdddest-$data
umount /dev/mapper/$hdddest-$crypt-data
cryptsetup close $hdddest-$crypt-data

# notifyd
curl -XPOST -d '{
    "token": "'$NOTIFYD_TOKEN'",
    "message": "バックアップが完了しました。"
}' localhost:5050
echo
echo -e '\x1b[38;05;2mBackup finished\e[0m'
