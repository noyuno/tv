#!/bin/bash -e

now=$(date +%Y%m%d)
while read line ; do
  file="$(basename $line)"
  date="${file%%-*}"
  in="/data/ts/$file"
  if [ $now -gt $((date + 7)) ]; then
    echo "Deleting $in"
    rm "$in"
  fi
done </data/list/encoded

