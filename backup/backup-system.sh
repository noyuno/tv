#!/bin/bash -e

mkdir -p /mnt/hdd/backup/system
cd /mnt/hdd/backup/system
fdisk -l /dev/nvme0n1 >fdisk
gdisk -l /dev/nvme0n1 > gdisk
df -h > df
cp /etc/fstab fstab
pvdisplay > pvdisplay
vgdisplay > vgdisplay
lvdisplay > lvdisplay
sudo nmcli > nmcli
firewall-cmd --list-all-zones > firewall-all-zones
pm2 stop all
sync
sync
sync
tar czf efi-vfat.tar.gz /boot/efi
dump -0 /dev/nvme0n1p2 | nice -n 10 pigz > boot-ext4dump.gz
xfsdump -l 0 - /dev/cl_m1/r | nice -n 10 pigz > root-xfsdump.gz
pm2 start all

# notifyd
curl -XPOST -d '{
    "token": "'"$NOTIFYD_TOKEN"'",
    "message": "システムのバックアップが完了しました。"
}' localhost:5050
