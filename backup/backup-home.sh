#!/bin/bash

source /home/noyuno/tv/.env
dest=/mnt/hdd/backup/home
mkdir -p $dest

# home dir
src=/home/noyuno
tar -cp $src | pigz -f $dest/home.tar.gz

# database
mysqldump -unoyuno -p$EPGSTATION_DB_PASS --single-transaction epgstation | nice -n 10 pigz > $dest/epgstation-mysql.gz
