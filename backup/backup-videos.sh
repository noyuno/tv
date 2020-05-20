#!/bin/bash -e
set -e

source /home/noyuno/tv/.env
src=/mnt/hdd/mp4
dest=/mnt/data/m2mp4
list=/mnt/hdd/mp4/00-backup-list.txt
mkdir -p $dest

if [ ! -d $src ]; then
  echo 'src directory not found, $src='$src 1>&2
  exit 1
fi
if [ ! -f $list ]; then
  echo 'file list not found, $list='$list 1>&2
  exit 1
fi
# videos

pushd $src
while read line ; do
  find . -type f | grep "$line" >> /tmp/backup-videos-list
done < $list
popd

rsync -ah --files-from=/tmp/backup-videos-list $src/ $dest

# notifyd
curl -XPOST -d '{
    "token": "'"$NOTIFYD_TOKEN"'",
    "message": "ビデオファイルのバックアップが完了しました。"
}' localhost:5050
