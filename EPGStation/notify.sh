#!/bin/bash -e

source /home/noyuno/tv/.env
mes="$1:\\\\n\
RECORDEDID=$RECORDEDID\\\\n\
PROGRAMID=$PROGRAMID\\\\n\
CHANNELTYPE=$CHANNELTYPE\\\\n\
CHANNELID=$CHANNELID\\\\n\
CHANNELNAME=$CHANNELNAME\\\\n\
STARTAT=$STARTAT\\\\n\
ENDAT=$ENDAT\\\\n\
DURATION=$DURATION\\\\n\
NAME=$NAME"
curl -s -X POST -H "Content-Type: application/json" -d '{"value1":"'$mes'"}' "https://maker.ifttt.com/trigger/m1/with/key/$IFTTTKEY"
