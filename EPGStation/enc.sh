#!/bin/bash

case "$VIDEORESOLUTION" in
  "720p" ) res="-s 1280x720" ;;
  "480p" ) res="-s 960x480" ;;
esac

nice -n 10 "$FFMPEG" -y  -dual_mono_mode main -i "$INPUT" \
    -movflags +faststart -map 0 -ignore_unknown -max_muxing_queue_size 1024 -sn \
    -vf bwdif=0:-1:1 -preset veryfast -aspect 16:9 $res \
    -c:v libx264 -crf 23 -coder 1 -c:a aac -ar 48000 -ab 192k -ac 2 -tune zerolatency "$OUTPUT"

tmpd=$(mktemp -d)
nice -n 10 comskip --ini /home/noyuno/tv/comskip.ini --output=$tmpd --output-filename=comskip "$OUTPUT"
c=0
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
chmod 777 "$OUTPUT"
