#!/bin/bash -e

source /home/noyuno/tv/.env
mes="$1:\\\\n\
    番組名: $NAME\\\\n\
    ファイル: $OUTPUT"

#curl -s -X POST -H "Content-Type: application/json" -d '{"value1":"'"$mes"'"}' "https://maker.ifttt.com/trigger/m1/with/key/$IFTTTKEY"
curl -XPOST -d '{ "token": "abc", "message": "'"$mes"'" }' localhost:5050
