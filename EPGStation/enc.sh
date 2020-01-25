#!/bin/bash

mode=$1

if [ "$mode" = "" ]; then
    mode="main"
fi

case "$VIDEORESOLUTION" in
  "720p" ) res="-s 1280x720" ;;
  "480p" ) res="-s 960x480" ;;
esac

nice -n 10 "$FFMPEG"-y  -dual_mono_mode "$mode" -i "$INPUT" \
    -movflags faststart -map 0 -ignore_unknown -max_muxing_queue_size 1024 -sn \
    -vf yadif=0:-1:1 -preset veryfast -aspect 16:9 $res \
    -c:v libx264 -crf 23 -c:a aac -ar 48000 -ab 192k -ac 2 -tune animation "$OUTPUT"
