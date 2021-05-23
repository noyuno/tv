#!/bin/bash

source /home/noyuno/tv/.env

#mes="$1:\\\\n\
#    番組名: $NAME\\\\n\
#    ファイル: $OUTPUT"
#curl -s -X POST -H "Content-Type: application/json" -d '{"value1":"'"$mes"'"}' "https://maker.ifttt.com/trigger/m1/with/key/$IFTTTKEY"

curl -XPOST -sd '{
    "token": "'"$NOTIFYD_TOKEN"'",
    "title": "'"$1"'",
    "fields": [
        { "name": "番組名", "value": "'"$NAME"'", "inline": false },
        { "name": "ファイル", "value": "'"$OUTPUT"'", "inline": false }
    ]
}' localhost:5050

:
