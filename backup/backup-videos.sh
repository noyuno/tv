#!/bin/bash -e

source /home/noyuno/tv/.env
src=/mnt/hdd/mp4
dest=/mnt/data/m2mp4
mkdir -p $dest

# videos

pushd $src
while read line ; do
  find . -type f | grep "$line" >> /tmp/backup-videos-list
done < /mnt/hdd/mp4/00-backup-list.txt
popd

rsync -avh --files-from=/tmp/backup-videos-list $src/ $dest

# notifyd
curl -XPOST -d '{
    "token": "'"$NOTIFYD_TOKEN"'",
    "message": "ビデオファイルのバックアップが完了しました。"
}' localhost:5050
