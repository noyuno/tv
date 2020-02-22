#!/bin/bash -e

source /home/noyuno/tv/.env
mes="$1:\\\\n\
  RECORDEDID=$RECORDEDID\\\\n\
  CHANNELID=$CHANNELID\\\\n\
  VIDEORESOLUTION=$VIDEORESOLUTION\\\\n\
  NAME=$NAME\\\\n\
  OUTPUT=$OUTPUT"

curl -s -X POST -H "Content-Type: application/json" -d '{"value1":"'"$mes"'"}' "https://maker.ifttt.com/trigger/m1/with/key/$IFTTTKEY"