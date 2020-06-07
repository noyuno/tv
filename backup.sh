#!/bin/bash

set -e

hddsrc=hddsg0
hdddest=hddsg1

while getopts sh opt; do
  case $opt in
    s) skip_system=1 ;;
    h) skip_home=1 ;;
  esac
done

# 1. mount
echo -e '\x1b[38;05;2mStep 1: Mounting filesystem\e[0m'

read -sp "Enter passphrase for /dev/mapper/$hddsrc-crypt and /dev/mapper/$hdddest-crypt: " pass
tty -s && echo

if [ ! "$(mount | grep ^/dev/mapper/$hddsrc-data\ on\ /mnt/$hddsrc-data\ type\ xfs)" ]; then
  mkdir -p /mnt/$hddsrc-data
  mount /dev/mapper/$hddsrc-data /mnt/$hddsrc-data
fi
if [ ! "$(mount | grep ^/dev/mapper/$hdddest-data\ on\ /mnt/$hdddest-data\ type\ xfs)" ]; then
  mkdir -p /mnt/$hdddest-data
  mount /dev/mapper/$hdddest-data /mnt/$hdddest-data
fi
if [ ! "$(mount | grep ^/dev/mapper/$hddsrc-crypt-data\ on\ /mnt/$hddsrc-crypt\ type\ xfs)" ]; then
  echo $pass | cryptsetup open /dev/mapper/$hddsrc-crypt hddsg0-crypt-data
  mkdir -p /mnt/$hddsrc-crypt
  mount /dev/mapper/$hddsrc-crypt-data /mnt/$hddsrc-crypt
fi
if [ ! "$(mount | grep ^/dev/mapper/$hdddest-crypt-data\ on\ /mnt/$hdddest-crypt\ type\ xfs)" ]; then
  echo $pass | cryptsetup open /dev/mapper/$hdddest-crypt hddsg1-crypt-data
  mkdir -p /mnt/$hdddest-crypt
  mount /dev/mapper/$hdddest-crypt-data /mnt/$hdddest-crypt
fi

# 2. system
if [ ! "$skip_system" ]; then
  echo -e '\x1b[38;05;2mStep 2: Backup system\e[0m'

  mkdir -p /mnt/$hddsrc-data/backup/system
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
if [ ! "$skip_home" ]; then
  echo -e '\x1b[38;05;2mStep 3: Backup home\e[0m'

  source /home/noyuno/tv/.env
  homedest=/mnt/$hddsrc-data/backup/home
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

# create history
echo data
#rsync -ah --info=progress2 --exclude=.history --exclude=backup --link-dest=/mnt/$hddsrc-data /mnt/$hddsrc-data/ /mnt/$hddsrc-data/.history/$(date +%Y%m%d-%H%S)
# copy
rsync -auhH --delete --info=progress2 /mnt/$hddsrc-data/ /mnt/$hdddest-data
#dt=$(date +%Y%m%d-%H%S)
#mkdir -p /mnt/$hdddest-data/.history/$dt
#command ls -a1 /mnt/$hdddest-data | grep -v -e .history -e '^\.$' -e '^\..$' | xargs -IPLACE mv /mnt/$hdddest-data/PLACE /mnt/$hdddest-data/.history/$dt
#rsync -auhH --delete --info=progress2 --exclude=.history --link-dest=.history/$dt /mnt/$hddsrc-data/ /mnt/$hdddest-data

# create history
echo crypt
#rsync -ah --info=progress2 --exclude=.history --exclude=backup --link-dest=/mnt/$hddsrc-crypt /mnt/$hddsrc-crypt/ /mnt/$hddsrc-crypt/.history/$(date +%Y%m%d-%H%S)
# copy
rsync -auhH --delete --info=progress2 /mnt/$hddsrc-crypt/ /mnt/$hdddest-crypt
#dt=$(date +%Y%m%d-%H%S)
#mkdir -p /mnt/$hdddest-crypt/.history/$dt
#command ls -a1 /mnt/$hdddest-crypt | grep -v -e .history -e '^\.$' -e '^\..$' | xargs -IPLACE mv /mnt/$hdddest-crypt/PLACE /mnt/$hdddest-crypt/.history/$dt
#rsync -auhH --delete --info=progress2 --exclude=.history --link-dest=.history/$dt /mnt/$hddsrc-crypt/ /mnt/$hdddest-crypt

# 5. umount
echo -e '\x1b[38;05;2mStep 5: Unmounting filesystem\e[0m'

sync
umount /dev/mapper/hddsg1-data
umount /dev/mapper/hddsg1-crypt-data
cryptsetup close hddsg1-crypt-data

# notifyd
curl -XPOST -d '{
    "token": "'$NOTIFYD_TOKEN'",
    "message": "バックアップが完了しました。"
}' localhost:5050
echo
echo -e '\x1b[38;05;2mBackup finished\e[0m'
