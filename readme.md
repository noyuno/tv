# 1. テレビ視聴・録画環境構築（基本システム）

## 1. 要件

1. NUC8i3BEH (Coffee Lake (8th), Intel Core i3-8109U, Intel® Iris® Plus Graphics 655, 4GB, M.2 SSD）
2. PX4-W3U4 (DTV x2, BS|CS x2)
3. カードリーダー
4. CentOS 8

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
- keyboard: japanese
- timezone: Asia/Tokyo
- install: base only
- hostname: m1.lan

~~~
Filesystem                Size  Used Avail Use% Mounted on
devtmpfs                  1.9G     0  1.9G   0% /dev
tmpfs                     1.9G     0  1.9G   0% /dev/shm
tmpfs                     1.9G   17M  1.9G   1% /run
tmpfs                     1.9G     0  1.9G   0% /sys/fs/cgroup
/dev/mapper/cl_m1-r        16G  7.9G  8.2G  50% /
/dev/nvme0n1p2            976M  100M  810M  11% /boot
/dev/nvme0n1p1            599M  6.8M  593M   2% /boot/efi
tmpfs                     382M     0  382M   0% /run/user/1000
/dev/mapper/cl_m1-backup  6.0G   76M  6.0G   2% /mnt/backup
/dev/mapper/cl_m1-data    436G  3.6G  433G   1% /mnt/data
~~~

## 5. ネットワーク設定

予め[RPM resource NetworkManager-wifi(x86-64)](https://rpmfind.net/linux/rpm2html/search.php?query=NetworkManager-wifi(x86-64))をダウンロードする。

~~~
sudo mount /dev/sdb1 /mnt
sudo rpm -ivh /mnt/NetworkManager-wifi* /mnt/wpa_supplicant*
sudo systemctl restart NetworkManager
nmcli d
~~~

SSHサーバはすでに立ち上がっているので、ネットワーク設定が終わったらすぐに接続できる。

avahiを設定

[Avahi - ArchWiki](https://wiki.archlinux.jp/index.php/Avahi)を参照。

## 6. ソフトウェアインストール

### 6.1. アップグレード

~~~
sudo dnf -y update
sudo reboot
~~~

### 6.2. カーネルバージョン固定

/etc/dnf/dnf.conf
~~~
excludepkgs=microcode_ctl kernel* docker-ce
~~~

/etc/sysconfig/kernel
~~~
UPDATEDEFAULT=no
~~~

### 6.3. 基本的なソフトウェアのインストール

~~~
curl -sL https://rpm.nodesource.com/setup_12.x | sudo bash -
sudo dnf config-manager --set-enabled PowerTools
sudo dnf localinstall -y --nogpgcheck https://download1.rpmfusion.org/free/el/rpmfusion-free-release-8.noarch.rpm
sudo dnf install -y --nogpgcheck https://download1.rpmfusion.org/nonfree/el/rpmfusion-nonfree-release-8.noarch.rpm
sudo dnf install -y http://rpmfind.net/linux/epel/7/x86_64/Packages/s/SDL2-2.0.10-1.el7.x86_64.rpm
sudo dnf -y update
sudo dnf -y install git tmux zsh tar wget gcc gcc-c++ nodejs ffmpeg unzip make kernel-headers kernel-devel elfutils-devel elfutils-libelf-devel yum-utils htop cmake bzip2 pcsc-lite pcsc-lite-libs pcsc-lite-ccid nss-tools avahi perl-ExtUtils-MakeMaker autoconf automake mariadb-server mariadb samba samba-client chrony xfsdump dump gpac bind-utils gdisk smartmontools sm rsync lm_sensors
sudo chsh -s /bin/zsh noyuno
~~~

### 6.4. エディタのインストール

~~~
sudo yum-config-manager --add-repo=https://copr.fedorainfracloud.org/coprs/carlwgeorge/ripgrep/repo/epel-7/carlwgeorge-ripgrep-epel-7.repo
sudo dnf -y install nano ripgrep vim-enhanced jq
sudo pip3 install neovim
git clone https://github.com/noyuno/dotfiles
./dotfiles/bin/dfdeploy

vi

:call dein#install()
:q
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
sudo systemctl start chronyd
sudo systemctl status chronyd
sudo systemctl enable chronyd
date
~~~

## 9. px4_drv

~~~
git clone https://github.com/nns779/px4_drv -b next
cd px4_drv/fwtool
make
wget http://plex-net.co.jp/plex/pxw3u4/pxw3u4_BDA_ver1x64.zip -O pxw3u4_BDA_ver1x64.zip
unzip -oj pxw3u4_BDA_ver1x64.zip pxw3u4_BDA_ver1x64/PXW3U4.sys
./fwtool PXW3U4.sys it930x-firmware.bin
sudo cp it930x-firmware.bin /lib/firmware/
cd ../driver
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
vi /usr/local/etc/mirakurun/tuners.yml
~~~

/usr/local/etc/mirakurun/tuners.yml
~~~
- name: PX4-S1
  types:
    - BS
    - CS
  command: /usr/local/bin/recpt1 --b25 --strip --device /dev/px4video0 <channel> - -

- name: PX4-S2
  types:
    - BS
    - CS
  command: /usr/local/bin/recpt1 --b25 --strip --device /dev/px4video1 <channel> - -

- name: PX4-G1
  types:
    - GR
  command: /usr/local/bin/recpt1 --b25 --strip --device /dev/px4video2 <channel> - -

- name: PX4-G2
  types:
    - GR
  command: /usr/local/bin/recpt1 --b25 --strip --device /dev/px4video3 <channel> - -
~~~

~~~
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
sudo nano /etc/my.cnf.d/mariadb-server.cnf
  [mariadb]
  character-set-server = utf8mb4
  [client-mariadb]
  default-character-set = utf8mb4
sudo systemctl restart mariadb
mysql -u root -p
  show variables like "chara%";
  create user  'noyuno'@'localhost' identified by '';
  create database epgstation;
  grant all on epgstation.* to 'noyuno'@'localhost';
~~~

## 15. セキュリティの設定

~~~
sudo setenforce 0
sudo nano /etc/sysconfig/selinux
~~~

~~~
SELINUX=disabled
~~~

~~~sh
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

c.f. [tv/disk.md at master · noyuno/tv](https://github.com/noyuno/tv/blob/master/disk.md)

## 17. Samba

Windows 10， iOS Infuseで閲覧

~~~
sudo nano /etc/fstab
~~~

~~~
/dev/mapper/cl_m1-r      /                       xfs     defaults        0 0
UUID=c1f041e1-2233-436f-a486-c2db9040482d /boot  ext4    defaults        1 2
UUID=2971-857F           /boot/efi               vfat    umask=0077,shortname=winnt 0 2
/dev/mapper/cl_m1-data   /mnt/data               xfs     defaults        0 0
/dev/mapper/cl_m1-vm     /mnt/vm                 xfs     defaults        0 0
/dev/mapper/hddsg0-data  /mnt/hddsg0-data        xfs     defaults        0 0
~~~

/etc/samba/smb.conf
~~~
[global]
    dos charset = CP932
    unix charset = UTF-8
    workgroup = WORKGROUP
    server string = Intel NUC/CentOS 8 TV Server
    hosts allow = 192.168.100. 192.168.5. localhost EXCEPT 192.168.100.1
    netbios name = m1
    dns proxy = no
    security = user
    map to guest = bad user
    printing = bsd
    printcap name = /dev/null
    local master = yes
    os level = 200
    browseable = yes
    min protocol = SMB2
    max protocol = SMB3
    unix extensions = no
    wide links = yes

[tv]
    path = /mnt/data/share/tv
    browsable = yes
    writable = yes
    guest ok = no
    read only = no
    create mode = 0644
    directory mode = 0755

[private]
    path = /mnt/hddsg0-crypt/data
    browsable = yes
    writable = yes
    guest ok = no
    read only = no
    create mode = 0644
    directory mode = 0755
~~~

~~~
sudo mkdir -p /mnt/data/share/{tv,m2,hdd}
cd /mnt/data/share/tv
ln -sfnv /mnt/data/ts m2-ts
ln -sfnv /mnt/data/encoder m2-encoder
ln -sfnv /mnt/data/m2mp4 m2-mp4

ln -sfnv /mnt/hdd/mp4 hdd-mp4
ln -sfnv /mnt/hdd/data hdd-data

cd ../m2
ln -sfnv /mnt/data/ts m2-ts
ln -sfnv /mnt/data/encoder m2-encoder
ln -sfnv /mnt/data/m2mp4 m2-mp4

cd ../hdd
ln -sfnv /mnt/hdd/mp4 hdd-mp4
ln -sfnv /mnt/hdd/data hdd-data

sudo chmod -R 0777 /mnt/data/share

sudo systemctl start smb
sudo systemctl start nmb
sudo systemctl enable smb
sudo systemctl enable nmb

sudo pdbedit -a noyuno
sudo pdbedit -L
~~~

~~~
[noyuno@m1 /mnt/hddsg0/backup/home] $ ll /mnt/data/share/tv
lrwxrwxrwx 1 noyuno noyuno 20 2020-06-06 19:48 hdd-mp4 -> /mnt/hddsg0-data/mp4/
lrwxrwxrwx 1 noyuno noyuno 12 2020-05-03 15:22 m2-ts -> /mnt/data/ts/
~~~

Windows+R type `\\m1\` to connect

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

~~~
git clone https://github.com/noyuno/tv
cd tv
git submodule update --init --recursive
./install
sudo mkdir /mnt/data/{mp4,ts}
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
