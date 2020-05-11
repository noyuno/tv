#!/bin/bash -e

source /home/noyuno/tv/.env
dest=/mnt/hdd/backup/home
mkdir -p $dest

# home dir
src=/home/noyuno
cd $src
tar -cp . | pigz > $dest/home.tar.gz

# database
mysqldump -unoyuno -p$EPGSTATION_DB_PASS --single-transaction epgstation | nice -n 10 pigz > $dest/epgstation-mysql.gz
