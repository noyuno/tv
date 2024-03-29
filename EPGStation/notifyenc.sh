#!/bin/bash

source /home/noyuno/tv/.env

#mes="$1:\\\\n\
#    番組名: $NAME\\\\n\
#    ファイル: $OUTPUT"
#curl -s -X POST -H "Content-Type: application/json" -d '{"value1":"'"$mes"'"}' "https://maker.ifttt.com/trigger/m1/with/key/$IFTTTKEY"

title=$1
if [ ! "$title" ]; then
    title="（タイトルなし）"
fi

name=$NAME
if [ ! "$name" ]; then
    name="（番組名なし）"
fi

url=http://192.168.1.22/#/recorded/detail/$RECORDEDID
if [ ! "$RECORDEDID" ]; then
    url="（RECORDEDIDなし）"
fi


curl -XPOST -sd '{
    "token": "'"$NOTIFYD_TOKEN"'",
    "title": "'"$title"'",
    "fields": [
        { "name": "番組名", "value": "'"$name"'", "inline": false },
        { "name": "URL", "value": "'"$url"'", "inline": false }
    ]
}' localhost:5050

:
