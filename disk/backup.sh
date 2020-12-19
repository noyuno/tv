#!/bin/bash -e

set -e

dt=$(TZ=GMT date +@GMT-%Y.%m.%d-%H.%M.%S)
snapshot=snapshot
hddsrc=hddsg0
hdddest=hddsg1
data=plain0
crypt=crypt0
rootdev=/dev/disk/by-id/ata-SanDisk_SDSSDA240G_161306407624
source /home/noyuno/tv/.env

output () {
  if [ "$verbose" -o $1 -eq 1 ]; then
    echo "$2"
  elif [ $1 -eq 2 ]; then
    echo "$2"
  elif [ $1 -eq 3 ]; then
    echo 'error: '"$2" 1>&2
  elif [ $1 -eq 4 ]; then
    echo -e '\x1b[38;05;2m'"$2"'\e[0m'
  fi
}

while getopts v opt; do
  case $opt in
    v) verbose=-v
       set -x ;;
  esac
done

if [ $USER != root ]; then
  output 3 'must be run as root' 1>&2
  exit 1
fi

# 1. mount
output 4 'Step 1: Mounting filesystem'

is_mounted() {
  dev=$1
  mpoint=$2
  if [ ! "$mpoint" ]; then
    mpoint=$dev
  fi
  mount | grep ^/dev/mapper/$dev\ on\ /mnt/$mpoint\ type || echo ''
}

mounted_src_data="$(is_mounted $hddsrc-$data)"
mounted_dest_data="$(is_mounted $hdddest-$data)"
mounted_src_crypt="$(is_mounted $hddsrc-$crypt-data $hddsrc-$crypt)"
mounted_dest_crypt="$(is_mounted $hdddest-$crypt-data $hdddest-$crypt)"

# LVM bug fix
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

unlocked_src_crypt="$(ls /dev/mapper/$hddsrc-$crypt-data || echo '')"
unlocked_dest_crypt="$(ls /dev/mapper/$hdddest-$crypt-data || echo '')"

pass=
require_unlock=()
[ ! "$unlocked_src_crypt" ] && require_unlock=("${require_unlock[@]}" "$hddsrc-$crypt")
[ ! "$unlocked_dest_crypt" ] && require_unlock=("${require_unlock[@]}" "$hdddest-$crypt")
if [ ${#require_unlock[@]} -gt 0 ]; then
  read -sp "Enter passphrase for ${require_unlock[*]}: " pass
  tty -s && echo
  if [ ! "$pass" ]; then
    output 3 'error: empty password'
    exit 1
  fi
fi

unlock() {
  target=$1
  dest=$2
  echo "$pass" | cryptsetup open $target $dest
}

[ ! "$unlocked_src_crypt" ] && unlock /dev/mapper/$hddsrc-$crypt $hddsrc-$crypt-data
[ ! "$unlocked_dest_crypt" ] && unlock /dev/mapper/$hdddest-$crypt $hdddest-$crypt-data

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
snapshot() {
  if [ $# -lt 2 ]; then
    output 3 'snapshot(): requires least 2 arguments: config, dest'
    exit 1
  fi
  config=$1
  dest=$2
  subvolume=$(snapper -c $config --json get-config | jq -r '.SUBVOLUME')
  snapper -c $config create -t single -d backup -u important=yes
  currentrev=$(snapper --jsonout -c $config list --columns number,type,date,cleanup,userdata | jq -r '.'$config'|map(select(.userdata.important=="yes"))|.[]|[.number]|@csv' | sort | tail -n 1)
  mkdir -p $dest
  beforerev=$(ls -v1 $dest | tail -n 1)
  if [ "$beforerev" ]; then
    exists_before=$(snapper --jsonout -c $config list --columns number,type,date,cleanup,userdata | jq -r '.'$config'|map(select(.number=='$beforerev'))|.[]|[.number]|@csv')
    if [ "$exists_before" ]; then
      output 2 "sending snapshot from $subvolume/.snapshots/$currentrev/snapshot to $dest/$currentrev (incremental from $subvolume/.snapshots/$beforerev/snapshot)"
      mkdir -p $dest/$currentrev
      btrfs send -p $subvolume/.snapshots/$beforerev/snapshot $subvolume/.snapshots/$currentrev/snapshot | pv | btrfs receive $dest/$currentrev
    else
      output 2 "sending snapshot from $subvolume/.snapshots/$currentrev/snapshot to $dest/$currentrev"
      mkdir -p $dest/$currentrev
      btrfs send $subvolume/.snapshots/$currentrev/snapshot | pv | btrfs receive $dest/$currentrev
    fi
  else
    output 2 "sending snapshot from $subvolume/.snapshots/$currentrev/snapshot to $dest/$currentrev"
    mkdir -p $dest/$currentrev
    btrfs send $subvolume/.snapshots/$currentrev/snapshot | pv | btrfs receive $dest/$currentrev
  fi
}

echo -e '\x1b[38;05;2mStep 2: Backup system\e[0m'

mkdir -p /mnt/$hddsrc-$data/backup/system
pushd $_
  gdisk -l $rootdev > gdisk
  df -h > df
  cp /etc/fstab fstab
  pvdisplay > pvdisplay
  vgdisplay > vgdisplay
  lvdisplay > lvdisplay
  firewall-cmd --list-all-zones > firewall-all-zones
  sync
  tar czf efi-vfat.tar.gz /boot/efi
  dump -0 -z -f boot-ext4dump.gz $rootdev-part2
popd
snapshot root /mnt/$hddsrc-$data/backup/root

# 3. database
echo -e '\x1b[38;05;2mStep 3: Backup database\e[0m'

epgdb=/mnt/$hddsrc-$data/backup/epgstation
mkdir -p $epgdb
# database
pushd /home/noyuno/EPGStation
  npm run backup $epgdb/database
popd

# 4. USB HDD data
echo -e '\x1b[38;05;2mStep 4: Syncing HDD\e[0m'

# data0
snapshot tv /mnt/$hdddest-$data/backup/tv
# crypt0
snapshot private /mnt/$hdddest-$crypt/backup/private

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

