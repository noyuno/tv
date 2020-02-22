#!/bin/bash -e

source /home/noyuno/tv/.env
st=$(date -d @$(echo $STARTAT/1000 | bc) +"%Y%m%d-%H%M")
en=$(date -d @$(echo $ENDAT/1000 | bc) +"%Y%m%d-%H%M")
du=$(echo $DURATION/1000/60 | bc)
mes="$1:\\\\n\
  RECORDEDID=$RECORDEDID\\\\n\
  PROGRAMID=$PROGRAMID\\\\n\
  CHANNELTYPE=$CHANNELTYPE\\\\n\
  CHANNELID=$CHANNELID\\\\n\
  CHANNELNAME=$CHANNELNAME\\\\n\
  STARTAT=$st\\\\n\
  ENDAT=$en\\\\n\
  DURATION=$du\\\\n\
  NAME=$NAME"
curl -s -X POST -H "Content-Type: application/json" -d '{"value1":"'"$mes"'"}' "https://maker.ifttt.com/trigger/m1/with/key/$IFTTTKEY"
