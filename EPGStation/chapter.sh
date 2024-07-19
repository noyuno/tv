#!/bin/bash

tmpd=$(mktemp -d)
if [ ! -d "$tmpd" ]; then
  echo 'mktemp failure' >&1
  exit 1
fi

nice -n 10 comskip --ini /home/noyuno/tv/comskip.ini --output=$tmpd --output-filename=comskip "$OUTPUT"
c=1
printf "CHAPTER%02d=0:00:00.00\n" $c >> $tmpd/comskip.chp
printf "CHAPTER%02dNAME=%02d-program\n" $c $c >> $tmpd/comskip.chp
while read line ; do
  c=$((c+1))
  if [ $(echo "$line" | awk '{print $2}') = 'start' ]; then
    t='cm'
  else
    t='program'
  fi
  printf "CHAPTER%02d=%s\n" $c $(echo "$line" | awk '{print $1}') >> $tmpd/comskip.chp
  printf "CHAPTER%02dNAME=%02d-%s\n" $c $c $t >> $tmpd/comskip.chp
done < $tmpd/comskip.vdr

nice -n 10 MP4Box -chap $tmpd/comskip.chp "$OUTPUT"

rm -rf "$tmpd"
