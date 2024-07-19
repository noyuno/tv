#!/bin/bash -e

(
case "$1" in
  "720p")
    vf="bwdif=0:-1:1,scale=-2:720"
    crf=25
    ;;
  *)
    vf="bwdif=0:-1:1"
    crf=23
    ;;
esac

date +%Y%m%d-%HH%MM
echo FFMPEG=$FFMPEG
echo INPUT="$INPUT"
echo OUTPUT="$OUTPUT"

nice -n 10 "$FFMPEG" -y -dual_mono_mode main -i "$INPUT" \
    -movflags +faststart -map 0:v -ignore_unknown -max_muxing_queue_size 1024 -sn \
    -vf "$vf" -preset veryfast -aspect 16:9 \
    -c:v libx264 -crf "$crf" -coder 1 -map 0:a -c:a aac -ar 48000 -ab 192k -ac 2 \
    "$OUTPUT" < /dev/null &&:

if [ $(wc -c "$OUTPUT" |awk '{print $1}') -lt 1000000 ]; then
  bash /home/noyuno/tv/EPGStation/notifyenc.sh ':x: エンコードに失敗(<1Mbyte): '"$NAME" &&:
  exit 1
fi

OUTPUT="$OUTPUT" bash /home/noyuno/tv/EPGStation/chapter.sh &&:

dirname "$OUTPUT" | xargs chmod 777
chmod 777 "$OUTPUT"

if [ "$OUTPUT" ]; then
  bash /home/noyuno/tv/EPGStation/notifyenc.sh ':coffee: '"$NAME" &&:
else
  bash /home/noyuno/tv/EPGStation/notifyenc.sh ':x: エンコードに失敗(chapter): '"$NAME" &&:
fi
) | tee -a /home/noyuno/EPGStation/logs/enc.sh.log
