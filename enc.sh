#!/bin/bash -e

enclist=/data/list/encoded.txt

read2arr() {
  [[ $1 =~ ^[a-zA-Z][a-zA-Z0-9_]*$ ]] || return 1
  local IFS=
  eval "local $1_"
  eval "$1=()"
  eval "while read -r $1_ || [[ -n \$$1_ ]]; do $1+=(\"\$$1_\"); done"
}

encode() {
  local IFS=
  mkdir -p /data/list
  touch $enclist
  chmod 777 $enclist
  read2arr encoded < $enclist

  find /data/ts -type f | while read line ; do
    file="$(basename \'$line\')"
    file="${file%.*}"
    in="/data/ts/$file.ts"
    out="/data/mp4/$file.mp4"
    if ! `echo ${encoded[@]} | grep -q "$file"`; then
      echo "Encoding $in"
      /usr/bin/ffmpeg -y -dual_mono_mode main -i "$in" \
        -movflags faststart -map 0 -ignore_unknown -max_muxing_queue_size 1024 -sn \
        -vf yadif=0:-1:1 -preset veryfast -aspect 16:9 \
        -c:v libx264 -crf 23 -c:a aac -ar 48000 -ab 192k -ac 2 "$out" &&:
      echo "$file" >> $enclist
    fi
  done
}

encode

