#!/bin/bash

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
echo INPUT=$INPUT
echo OUTPUT=$OUTPUT

nice -n 10 "$FFMPEG" -y  -dual_mono_mode main -i "$INPUT" \
    -movflags +faststart -map 0 -ignore_unknown -max_muxing_queue_size 1024 -sn \
    -vf "$vf" -preset veryfast -aspect 16:9 \
    -c:v libx264 -crf "$crf" -coder 1 -c:a aac -ar 48000 -ab 192k -ac 2 "$OUTPUT"

OUTPUT="$OUTPUT" bash /home/noyuno/tv/EPGStation/chapter.sh

dirname "$OUTPUT" | xargs chmod 777
chmod 777 "$OUTPUT"

bash /home/noyuno/tv/EPGStation/notifyenc.sh ':coffee: エンコードが完了しました' &&:
) | tee -a /home/noyuno/EPGStation/logs/enc.sh.log
