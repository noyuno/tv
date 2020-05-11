#!/bin/bash -e

mkdir -p /mnt/hdd/backup/system
cd /mnt/hdd/backup/system
df -h > df
cp /etc/fstab fstab
pvdisplay > pvdisplay
vgdisplay > vgdisplay
lvdisplay > lvdisplay
sudo nmcli > nmcli
firewall-cmd --list-all-zones > firewall-all-zones
pm2 stop all
xfsdump -l 0 - /dev/cl_m1/r | nice -n 10 pigz > root-xfsdump.gz
pm2 start all
