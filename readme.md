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
4. ソフトウェアエンコード
5. 録画データはEPGStation(Windows:VLC, iOS:Infuse)とSambaでMP4を視聴
6. 死活管理は行わない。録画エラーが発生したらDiscordで報告
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

## 5. 基本的なソフトウェアのインストール

~~~
sudo apt update
sudo apt -y upgrade
sudo apt -y install zsh build-essential cmake pkg-config autoconf nodejs ffmpeg unzip linux-headers-generic dkms pcscd libccid libpcsclite-dev libpcsclite1 libtool libavutil-dev libavformat-dev libavcodec-dev avahi-daemon npm mariadb-server samba firewalld smartmontools neovim ripgrep jq dump
~~~

## 6. ネットワーク設定

### netplan

Netplan: `/etc/netplan/00-installer-config.yaml`

~~~
# This is the network config written by 'subiquity'
network:
  ethernets:
    enp5s0:
      addresses:
      - 192.168.100.22/24
      - 192.168.100.23/24
      gateway4: 192.168.100.1
      nameservers: {}
  version: 2
~~~

### ufw

~~~
sudo apt remove ufw firewalld
sudo apt install iptables-persistent
~~~

`/etc/iptables/rules.v4`

~~~
*filter
:INPUT DROP [0:0]
#:INPUT ACCEPT [0:0]
:FORWARD DROP [0:0]
#:FORWARD ACCEPT [0:0]
:OUTPUT ACCEPT [0:0]
:TCP - [0:0]
:UDP - [0:0]

-A INPUT -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
-A INPUT -i lo -j ACCEPT
-A INPUT -m conntrack --ctstate INVALID -j DROP
-A INPUT -p icmp -m icmp --icmp-type 8 -m conntrack --ctstate NEW -j ACCEPT
-A INPUT -p udp -m conntrack --ctstate NEW -j UDP
-A INPUT -p tcp --tcp-flags FIN,SYN,RST,ACK SYN -m conntrack --ctstate NEW -j TCP

-A INPUT -d 192.168.100.22 -p tcp --dport 8022 -j ACCEPT
-A INPUT -d 192.168.100.22 -p udp --dport 8022 -j ACCEPT

-A TCP -p tcp --dport 22 -j ACCEPT
-A UDP -p udp --dport 137:138 -j ACCEPT
-A TCP -p tcp --dport 139 -j ACCEPT
-A TCP -p tcp --dport 445 -j ACCEPT

-A TCP -p tcp --dport 9090 -j ACCEPT
-A UDP -p udp --dport 9090 -j ACCEPT

-A FORWARD -p tcp --dport 8022 -j ACCEPT
-A FORWARD -p udp --dport 8022 -j ACCEPT

COMMIT

*nat
:POSTROUTING ACCEPT [0:0]
# 内側から外側
-A POSTROUTING -s 192.168.100.0/24 -o enp5s0 -j MASQUERADE
# 外側から内側
-A PREROUTING -i enp5s0 -d 192.168.100.22 -p tcp --dport 80 -j  DNAT --to-destination 192.168.100.22:8022
-A PREROUTING -i enp5s0 -d 192.168.100.22 -p udp --dport 80 -j  DNAT --to-destination 192.168.100.22:8022
COMMIT
~~~

### dns

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

### 設定

`usb_alloc_coherent() failed` 対策

`/etc/modprobe.d/px4_drv.conf`

~~~
options px4_drv max_urbs=4
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

## 16. ストレージ

### 16.1. システム

snapper 

~~~
sudo snapper -c root create-config /
~~~

### 16.2. データ (現用 hddsg0)

~~~
sudo gdisk /dev/sdX
> o y
> n 8e00
cryptsetup benchmark
~~~

LVMパーティション作成

~~~
sudo vgcreate hddsg0 /dev/sdX1
sudo lvcreate -L 4T /dev/mapper/hddsg0 -n plain0
sudo lvcreate -L 800G /dev/mapper/hddsg0 -n crypt0
sudo mkfs.btrfs /dev/mapper/hddsg0-plain0
sudo cryptsetup luksFormat -c aes-xts-plain64 -s 512 /dev/mapper/hddsg0-crypt0
sudo cryptsetup open /dev/mapper/hddsg0-crypt0 hddsg0-crypt0-data
sudo mkfs.btrfs /dev/mapper/hddsg0-crypt0-data

sudo mkdir /mnt/hddsg0-plain0
sudo mount -onoatime /dev/mapper/hddsg0-plain0 /mnt/hddsg0-plain0
sudo mkdir /mnt/hddsg0-crypt0
sudo mount -onoatime,compress=zstd /dev/mapper/hddsg0-crypt0-data /mnt/hddsg0-crypt0
~~~

Btrfsサブボリューム作成

~~~
sudo btrfs subvolume create /mnt/hddsg0-plain0/tv
sudo btrfs subvolume create /mnt/hddsg0-crypt0/private
~~~

snapper

~~~
sudo snapper -c tv create-config /mnt/hddsg0-plain0/tv
sudo snapper -c private create-config /mnt/hddsg0-crypt0/private
~~~

シンボリックリンクを作成。

~~~
sudo ln -sfnv /mnt/hddsg0-data0/active/tv /mnt/data/tv
~~~

fstabに追加

~~~
/dev/mapper/hddsg0-plain0 /mnt/hddsg0-plain0 btrfs noatime 0 0
~~~

### 16.3. データ (予備 hddsg2)

~~~
sudo gdisk /dev/sdX
> o y
> n 8e00
cryptsetup benchmark
~~~

LVMパーティション作成

~~~
sudo pvcreate /dev/sdX1
sudo vgcreate hddsg2 /dev/sdX1
sudo lvcreate -L 4T /dev/mapper/hddsg2 -n plain0
sudo lvcreate -L 1T /dev/mapper/hddsg2 -n crypt0
sudo mkfs.btrfs /dev/mapper/hddsg2-plain0
sudo cryptsetup luksFormat -c aes-xts-plain64 -s 512 /dev/mapper/hddsg2-crypt0
sudo cryptsetup open /dev/mapper/hddsg2-crypt0 hddsg2-crypt0-data
sudo mkfs.btrfs /dev/mapper/hddsg2-crypt0-data

sudo mkdir /mnt/hddsg2-plain0
sudo mount -onoatime /dev/mapper/hddsg2-plain0 /mnt/hddsg2-plain0
sudo mkdir /mnt/hddsg2-crypt0
sudo mount -onoatime,compress=zstd /dev/mapper/hddsg2-crypt0-data /mnt/hddsg2-crypt0
~~~

Btrfsサブボリューム作成

~~~
sudo btrfs subvolume create /mnt/hddsg2-plain0/tv
sudo btrfs subvolume create /mnt/hddsg2-crypt0/private
~~~


## 17. Samba

### 17.1. サーバ

~~~
sudo cp disk/smb.conf /etc/samba/smb.conf
sudo systemctl enable --now smb nmb

sudo pdbedit -a noyuno
sudo pdbedit -L
~~~

### 17.2. クライアント

ごみ箱を使うには、Windows側から次のレジストリをインポートする必要がある。

- disk/admin.reg : 管理者として結合
- disk/user.reg : 一般ユーザとして結合

## 18. バックアップ・リストア

### 18.1. バックアップ

~~~
sudo ./disk/backup.sh
~~~

### 18.2. リストア

rootはUSBbootして復元する必要がある。復元先のファイルシステムのルートディレクトリを`/mnt`にマウントする場合は次のとおりとなる。

~~~
pushd /mnt
sudo tar xf /mnt/hddsg2-plain0/backup/root/XXX/snapshot/home/noyuno/backup/system/efi-vfat.tar.gz
popd
pushd /mnt/boot
sudo restore -rf /mnt/hddsg2-plain0/backup/root/XXX/snapshot/home/noyuno/backup/system/boot-ext4dump.gz
popd
sudo btrfs copy /mnt/hddsg2-plain0/backup/root/XXX/snapshot /mnt
~~~

データ

~~~
sudo btrfs copy /mnt/hddsg2-plain0/tv/.snapshots/XXX/snapshot /mnt/hddsg0-plain0/tv
sudo btrfs copy /mnt/hddsg2-crypt0/private/.snapshots/XXX/snapshot /mnt/hddsg0-crypt0/tv
~~~

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
npm run restore /mnt/hddsg0-plain0/active/backup/epgstation/database
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

# 2. トラブルシューティング

## 1. カクカクする

アンテナケーブルの接点不良。アンテナケーブルがねじ式でないと外れやすい。

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


### 11. dmesgに `px4_drv: usb_alloc_coherent() failed` が出て録画が失敗する

モジュールの設定を変更する。`/etc/modprobe.d/px4_drv.conf` を新規作成して、次のとおり設定する。

~~~
options px4_drv max_urbs=4
~~~

### 12. ufwが自動起動できない

`iptables-persistent`に乗り換える。

~~~
sudo apt install iptables-persistent
~~~
