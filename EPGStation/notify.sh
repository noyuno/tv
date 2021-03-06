#!/bin/bash

source /home/noyuno/tv/.env
if [ "$STARTAT" ]; then
  st=$(date -d @$(echo $STARTAT/1000 | bc) +"%Y%m%d-%H%M")
fi
if [ "$ENDAT" ]; then
  en=$(date -d @$(echo $ENDAT/1000 | bc) +"%Y%m%d-%H%M")
fi
if [ "$DURATION" ]; then
  du=$(echo $DURATION/1000/60 | bc)
fi
#mes="$1:\\\\n\
#    番組名: $NAME\\\\n\
#    チャンネル: $CHANNELNAME\\\\n\
#    時間: $st から $du 分間"
#curl -s -X POST -H "Content-Type: application/json" -d '{"value1":"'"$mes"'"}' "https://maker.ifttt.com/trigger/m1/with/key/$IFTTTKEY"
# mes="$1:\\n\
#     番組名: $NAME\\n\
#     チャンネル: $CHANNELNAME\\n\
#     時間: $st から $du 分間"
#curl -XPOST -d '{ "token": "abc", "message": "'"$mes"'" }' localhost:5050
curl -XPOST -d '{
    "token": "'"$NOTIFYD_TOKEN"'",
    "title": "'"$1"'",
    "fields": [
        { "name": "番組名", "value": "'"$NAME"'", "inline": false },
        { "name": "チャンネル", "value": "'"$CHANNELNAME"'", "inline": false },
        { "name": "開始", "value": "'"$st"'", "inline": true },
        { "name": "長さ", "value": "'"$du"'分", "inline": true }
    ]
}' localhost:5050
