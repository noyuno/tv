# 1. テレビ視聴・録画環境構築（基本システム）

## 1. 要件

1. AMD Ryzen 3 CPU
2. PX4-Q3PX4 (DTV x4, BS|CS x4)
3. カードリーダー
4. Ubuntu 20.04 LTS

## 2. 仕様

1. EPGStationでTSを視聴(Windows:VLC,iOS:Infuse)、録画予約
2. 録画予約は「MP4 1920x1080 CPU, TS削除」
3. MP4にはCMの区切りにチャプターを付ける（CMは削除しない）
4. ハードウェアエンコードは歪むので使わない
5. 録画データはEPGStation(Windows:VLC, iOS:Infuse)とSambaでMP4を視聴
6. HDD2台構成（rsync同期）。死活管理は行わない。録画エラーが発生したらDiscordで報告
7. LANのみ

## 3. Rufus で書き込み

[Rufus](https://rufus.ie/)

## 4. インストーラを起動

- language: english
- keyboard: englist
- install: docker, microkube
- hostname: m1.lan

~~~
Filesystem                           Size  Used Avail Use% Mounted on
udev                                 2.9G     0  2.9G   0% /dev
tmpfs                                594M  1.4M  593M   1% /run
/dev/mapper/ubuntu--vg-ssdub0--root  150G  6.4G  143G   5% /
/dev/sda2                            976M  104M  805M  12% /boot
/dev/sda1                            511M  7.8M  504M   2% /boot/efi
~~~

### 5. 基本的なソフトウェアのインストール

~~~
sudo apt update
sudo apt -y upgrade
sudo apt -y install zsh build-essential cmake pkg-config autoconf nodejs ffmpeg unzip linux-headers-generic dkms pcscd libccid libpcsclite-dev libpcsclite1 libtool libavutil-dev libavformat-dev libavcodec-dev avahi-daemon npm mariadb-server samba firewalld smartmontools neovim ripgrep jq dump
~~~

## 6. ネットワーク設定


DNS:`/etc/systemd/resolved.conf`

~~~
DNS=192.168.100.1 8.8.8.8 8.8.4.4
~~~

## 7. sudoの設定

~~~
sudo visudo

Defaults timestamp_timeout = 30
Defaults    secure_path = /sbin:/bin:/usr/sbin:/usr/bin:/usr/local/bin:/usr/local/sbin
~~~

## 8. 時刻の設定

UTC非対応なので、JSTにする。

~~~
date
timedatectl set-timezone Asia/Tokyo
date
~~~

## 9. px4_drv

~~~
git clone https://github.com/nns779/px4_drv -b next
cd px4_drv/fwtool
make
wget http://plex-net.co.jp/download/pxq3pe4v1.4.zip
unzip -oj pxq3pe4v1.4.zip x64/PXQ3PE4.sys
./fwtool PXQ3PE4.sys it930x-firmware.bin
sudo cp it930x-firmware.bin /lib/firmware/
cd ..
~~~

DKMSを使う場合

~~~
sudo cp -a ./ /usr/src/px4_drv-0.2.1
sudo dkms add px4_drv/0.2.1
sudo dkms install px4_drv/0.2.1
~~~

DKMSを使わない場合

~~~
cd driver
sudo make install
lsmod | grep -e ^px4_drv
ls /dev/px4video*
~~~

## 10. カードリーダー

~~~
wget http://ludovic.rousseau.free.fr/softwares/pcsc-perl/pcsc-perl-1.4.14.tar.bz2
cd pcsc-perl-1.4.14
perl Makefile.PL
make
sudo make install
cd

wget http://ludovic.rousseau.free.fr/softwares/pcsc-tools/pcsc-tools-1.5.5.tar.bz2
tar xf pcsc-tools-1.5.5.tar.bz2
cd pcsc-tools-1.5.5
./configure
make
sudo make install

sudo systemctl enable pcscd
sudo systemctl start pcscd
sudo systemctl status pcscd

sudo pcsc_scan
> Japanese Chijou Digital B-CAS Card (pay TV)
~~~

## 11. libarib25

~~~
git clone https://github.com/stz2012/libarib25
cd libarib25
cmake .
make
sudo make install
echo '/usr/local/lib64' | sudo tee /etc/ld.so.conf.d/usr-local-lib64.conf
sudo ldconfig
~~~

## 12. recpt1

~~~
git clone https://github.com/stz2012/recpt1
cd recpt1/recpt1
./autogen.sh
./configure --enable-b25
make
sudo make install
~~~

## 13. チューナのテスト

~~~
sudo recpt1 --b25 --strip BS09_0 10 bs11.ts
sudo recpt1 --b25 --strip 18 10 18.ts
~~~

in client, type

~~~
scp m1:bs11.ts .
~~~

## 14. Mirakurun

### 14.1. インストール・設定

~~~
sudo npm install pm2 -g
sudo pm2 install pm2-logrotate
sudo npm install mirakurun -g --unsafe-perm --production
echo [] | sudo tee /usr/local/var/db/mirakurun/programs.json
sudo chmod -R go+rw /usr/local/etc/mirakurun
sudo cp tuners.yml /usr/local/etc/mirakurun/tuners.yml

sudo pm2 restart mirakurun-server --node-args --max_old_space_size=1024 
sudo pm2 logs mirakurun-server
curl -X PUT "http://localhost:40772/api/config/channels/scan"
~~~

### 14.2. MariaDB

~~~
sudo systemctl start mariadb
sudo systemctl status mariadb
sudo systemctl enable mariadb
sudo mysql_secure_installation
  Remove anonymouse users: y
  Disallow root login remotely: n
  Remove test database and access to it: y
  Reload privilege table now: y
sudo vi /etc/my.cnf.d/mariadb-server.cnf
sudo nano /etc/mysql/mariadb.conf.d/50-server.cnf
  [mariadb]
  character-set-server = utf8mb4
sudo nano /etc/mysql/mariadb.conf.d/50-client.cnf
  [client-mariadb]
  default-character-set = utf8mb4
sudo systemctl restart mariadb
sudo mysql -u root -p
  show variables like "chara%";
  create user  'noyuno'@'localhost' identified by '';
  create database epgstation;
  grant all on epgstation.* to 'noyuno'@'localhost';
~~~

パスワード変更

~~~
set password for noyuno@localhost = PASSWORD('password');
~~~

## 15. セキュリティの設定

~~~sh
sudo systemctl enable --now firewalld
sudo firewall-cmd --zone=public --add-service=http --permanent
sudo firewall-cmd --zone=public --add-port=81/tcp --permanent
sudo firewall-cmd --zone=public --add-port=81/udp --permanent
sudo firewall-cmd --zone=public --add-port=8889/tcp --permanent
sudo firewall-cmd --zone=public --add-port=8889/udp --permanent
sudo firewall-cmd --permanent --zone=public --add-service=samba
sudo firewall-cmd --add-source=192.168.100.1 --zone=drop --permanent
sudo firewall-cmd --reload
sudo firewall-cmd --list-all
sudo firewall-cmd --list-all --zone=drop
sudo reboot
~~~

firewalldではnotifydを動かすためにマスカレードを追加する

## 16. HDD増設

c.f. [tv/disk/disk.md at master · noyuno/tv](https://github.com/noyuno/tv/blob/master/disk/disk.md)

## 17. Samba

c.f. [tv/disk/disk.md at master · noyuno/tv](https://github.com/noyuno/tv/blob/master/disk/disk.md)


## 18.（削除）

（削除）

## 19. EPGStation

~~~
git clone https://github.com/l3tnun/EPGStation.git
cd EPGStation
npm install
npm run build
cd
~~~

データベースを復元

~~~
npm run restore /mnt/hddsg0-data0/active/backup/epgstation/database
~~~

~~~
git clone https://github.com/noyuno/tv
cd tv
git submodule update --init --recursive
./install
~~~

`EPGStation/config.json.example`をコピーしてパスワード部分を編集する！

~~~
sudo pm2 start dist/server/index.js --name "epgstation"
sudo pm2 save
sudo pm2 logs epgstation
~~~


## 20. discord (IFTTT編)

### 20.A. IFTTT（非推奨）

1. 右上の丸いボタンを押してCreateを押す。
2. 「This」ボタンを押して「Webhooks」と入力してクリックする。
3. 「Receive a web request」をクリック。
4. 「Event Name」に「tv」と入力し、「Create trigger」をクリック。
5. 「That」ボタンを押して「Webhooks」と入力してクリックする。
6. 「Make a web request」を押す。
7. 「URL」にDiscordのweb hook URLを入力する。MethodはPost。Content-Typeは「application/json」、Bodyに`{"content":"{{Value1}}"}`を入力する。

**テスト**

https://ifttt.com/maker_webhooks に移動。右上の「Documentation」をクリック。
eventに「tv」と入力、value1に「test」と入力して「Test it」を押す。

**設定**

上記テストで表示されたキーを控える。

`.env`に`IFTTTKEY=(キー)`を入力。

### 20.B. Discord (notifyd編)

~~~sh
nano .env # DISCORD_TOKENを入力
docker-compose up notifyd
curl localhost:5050
> notifyd
> hello
~~~

動かないときはファイアウォールを疑う

~~~sh
#sudo nmcli c m br-dd5bc31eebee connection.zone trusted
#sudo firewall-cmd --change-interface=br-dd5bc31eebee --zone trusted --permanent
#sudo iptables -I DOCKER -i eno1 -j DROP
#echo 'iptables -I DOCKER -i eno1 -j DROP' | sudo tee -a  /etc/rc.d/rc.local
#sudo chmod +x /etc/rc.d/rc.local
~~~

## 21. ComskipでCMの区切りにチャプターを付ける

~~~
curl -sLO http://prdownloads.sourceforge.net/argtable/argtable2-13.tar.gz
tar xf argtable2-13.tar.gz
./configure
make
sudo make install
cd
git clone git://github.com/erikkaashoek/Comskip
cd Comskip
./autogen.sh
PKG_CONFIG_PATH=/usr/local/lib/pkgconfig ./configure
make
sudo make install
cd

~~~

# 2. テレビ視聴・録画環境構築（オプション）

## 1. ゲストモード

ゲストがWi-Fiに接続してテレビを視聴できるようにする。

~~~
sudo yum -y install dnsmasq iw hostapd
git clone https://github.com/oblique/create_ap
cd create_ap
sudo make install

# test
sudo create_ap -n wlp0s20f3 m1 wifi-passphrase
sudo firewall-cmd --zone=trusted --change-interface=ap0
~~~

/etc/create_ap.conf
~~~conf
WIFI_IFACE=wlp0s20f3
SHARE_METHOD=none
SSID=m1
PASSPHRASE=wifiwifi
~~~

~~~
sudo firewall-cmd --zone=trusted --change-interface=ap0 --permanent
sudo firewall-cmd --reload
sudo systemctl start create_ap
sudo systemctl status create_ap
sudo systemctl enable create_ap
~~~

## 2. 外部からVPNアクセス

### 2.1. DDNSを設定する (***m1***)

ドメイン設定で、「ダイナミックDNS機能」を有効にする

### 2.2. IPアドレスを定期的に通知する (***m1***)

cat /etc/cron.d/ddns
~~~
# Run the hourly jobs
SHELL=/bin/bash
PATH=/sbin:/bin:/usr/sbin:/usr/bin
MAILTO=root
02,17,32,47 * * * * root curl 'https://dyn.value-domain.com/cgi-bin/dyn.fcg?d=noyuno.jp&p=xxxxxxxxxxxxxxxxxxxx&h=m1'
~~~

### 2.3 プライベートIPアドレスを固定する (***m1***)

~~~
sudo nmcli connection modify eno1 ipv4.addresses 192.168.100.222/24
sudo nmcli connection modify eno1 ipv4.gateway 192.168.100.1
sudo nmcli connection modify eno1 ipv4.dns 192.168.100.1
sudo nmcli connection modify eno1 ipv4.method manual
~~~

### 2.4. WireGuardで接続

c.f. [noyuno/k3 readme.md 3. VPN(WireGuard)](https://github.com/noyuno/k3#3-vpnwireguard)


## 3. バックアップ

c.f. [tv/disk.md at master · noyuno/tv](https://github.com/noyuno/tv/blob/master/disk.md)

# 3. トラブルシューティング

## 1. カクカクする

アンテナケーブルがねじ式でないと外れやすい。

## 2. Mirakurunが"Error: no available tuners"を吐く

recpt1を絶対パスで指定。sudoの`secure_path`に`/usr/local/bin`を入れても無意味。

## 3. VLCで映像が乱れる

「ツール>設定>すべて」にチェック。「ビデオ>出力モジュール」の「ビデオ出力モジュール」が「Direct3D11ビデオ出力」になっていると乱れるので、「Direct3D9ビデオ出力」にする

## 4. PM2が10分ごとに落ちる

Wi-Fiの接続が途切れるのが原因

`journalctl -f`

~~~
Jan 18 21:59:51 tv.lan wpa_supplicant[1347]: wlo2: WPA: Group rekeying completed with 00:23:b1:99:1f:1f [GTK=CCMP]
Jan 18 21:59:55 tv.lan systemd[1]: pm2-root.service: Start operation timed out. Terminating.
Jan 18 21:59:56 tv.lan systemd[1]: pm2-root.service: Failed with result 'timeout'.
Jan 18 21:59:56 tv.lan systemd[1]: Failed to start PM2 process manager.
Jan 18 21:59:56 tv.lan systemd[1]: pm2-root.service: Service RestartSec=100ms expired, scheduling restart.
Jan 18 21:59:56 tv.lan systemd[1]: pm2-root.service: Scheduled restart job, restart counter is at 129.
Jan 18 21:59:56 tv.lan systemd[1]: Stopped PM2 process manager.
~~~

サーバは有線でつなげるべき


## 5. EPGStationで視聴はできるが録画はできない

時間が正しいか確認する。UTCは非対応。

## 6. Windows10でSMBにアクセスするとセキュリティポリシーがうんぬん

[「組織のセキュリティポリシーによって非認証のゲストアクセスがブロックされているためこの共有フォルダーにアクセスできません」と表示される｜Q&A | IODATA アイ・オー・データ機器](https://www.iodata.jp/support/qanda/answer/s30200.htm)

## 7. mpegTsViewerにInfuseを指定するとエラー

## 8. docker build . をするとネットワークエラー

~~~sh
sudo firewall-cmd --set-log-denied all 
journalctl -xef

sudo nmcli c
sudo nmcli c m docker0 connection.zone trusted
#sudo nmcli c m br-0ce92c3e48f5 connection.zone internal
sudo nmcli c m br-dd5bc31eebee connection.zone trusted
sudo firewall-cmd --change-interface=br-dd5bc31eebee --zone trusted --permanent

sudo iptables -I DOCKER -i eno1 -j DROP
echo 'iptables -I DOCKER -i eno1 -j DROP' | sudo tee -a  /etc/rc.d/rc.local
sudo chmod +x /etc/rc.d/rc.local

docker-compose up
curl $(docker inspect $(docker ps -qf name=notifyd) | jq -r '.[].NetworkSettings.Networks.notifyd_default.IPAddress'):5050
> notifyd
> hello

sudo firewall-cmd --add-rich-rule='rule family=ipv4 source not address=127.0.0.1 destination address=172.19.0.0/16 drop'

sudo firewall-cmd --set-log-denied off
sudo firewall-cmd --reload
~~~

## 9. ストリーミングが読込中が頻繁に発生する

iperfを入れて帯域幅計測

~~~
curl -O https://downloads.es.net/pub/iperf/iperf-3.7.tar.gz
tar xf iperf-3.7.tar.gz
cd iperf-3.7
./configure
make
sudo make install
sudo ldconfig
sudo firewall-cmd --add-port=5201/tcp --zone=public 
sudo firewall-cmd --add-port=5201/udp --zone=public 
iperf3 -s

.\iperf3 -c 192.168.100.22
~~~

- iPad/iPhoneのストリーミング視聴は無変換-VLCではなくHLS-Safariが良い
- ルータを初期化してみる（治った実績あり）
- Infuse6はSMB3のバグがあり、転送速度が遅い。SMB2を強制する。

## 10. `docker-compose build` を実行すると `ERROR: http://dl-cdn.alpinelinux.org/alpine/v3.11/main: temporary error (try again later)`

DockerデーモンのDNSを設定する

/etc/docker/daemon.json
~~~
{
  "dns": ["8.8.8.8"]
}
~~~

## 11. CPU温度が100度とか爆熱

- 必ずTurboBoostを切ること。切ると最高でも60度程度になる。
