# notifyd

## Install

### Install python library

~~~
pip3 install -r requirements.txt
~~~

### Test

~~~
python3 -u main.py
~~~

### Start PM2

~~~
sudo pm2 start main.py --name notifyd --interpreter python3 --user noyuno
~~~

## Examples

### Set environment variables

put below variables into `.env`

~~~
DISCORD_TOKEN=
NOTIFYD_TOKEN=
DISCORD_CHANNEL_NAME=m1
PORT=5050
~~~

### Basic

~~~bash
curl -s -XPOST -d '{"message":"API test", "token": "'"$NOTIFYD_TOKEN"'"}' localhost:5050 >/dev/null
~~~

### Helper function

~~~bash
source ...../notifyd/.env
.....
message () {
    echo "$1"
    curl -XPOST -sd '{"message": "'"$CONTAINER_NAME"': '"$1"'", "token": "'"$NOTIFYD_TOKEN"'"}' localhost:5050 >/dev/null
    if [ $? -ne 0 ]; then
        echo "$CONTAINER_NAME: failed to send message to discordbot" >&2
    fi
}
.....
message "operation finished"
~~~

### Fields

~~~bash
source ...../notifyd/.env
.....
curl -XPOST -d '{
    "token": "'"$NOTIFYD_TOKEN"'",
    "title": "'"$TITLE"'",
    "fields": [
        { "name": "番組名", "value": "'"$NAME"'", "inline": false },
        { "name": "チャンネル", "value": "'"$CHANNELNAME"'", "inline": false },
        { "name": "開始", "value": "'"$st"'", "inline": true },
        { "name": "長さ", "value": "'"$du"'分", "inline": true }
    ]
}' localhost:5050
~~~

## Commands

### hi

just return 'hi'

