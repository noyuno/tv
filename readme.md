# 環境構築

## 要件

1. NUC7PJYH (24,000円くらい)
2. PX-W3U4 (16,000円くらい)
3. カードリーダー (1,600円くらい)
4. CentOS 8

## Rufus で書き込み

[Rufus](https://rufus.ie/)

## インストーラを起動

~~~
language: english
keyboard: japanese
timezone: Asia/Tokyo
install: base only
target: p(esp) /boot/efi, p(ext4) /boot, l(xfs) /
hostname: tv.lan
~~~

## ネットワーク設定

~~~
sudo mount /dev/sdb1 /mnt
sudo rpm -ivh /mnt/NetworkManager-wifi* /mnt/wpa_supplicant*
sudo systemctl restart NetworkManager
nmcli d
~~~

SSHサーバはすでに立ち上がっているので、ネットワーク設定が終わったらすぐに接続できる。

## LVリサイズ

~~~
sudo lvresize -l +100%FREE cl_tv/root
sudo xfs_growfs /
~~~

## ソフトウェアアップグレード

~~~
sudo dnf -y update
sudo reboot
~~~

## カーネルバージョン固定

/etc/dnf/dnf.conf
~~~
excludepkgs=microcode_ctl kernel*
~~~

## 基本的なソフトウェアのインストール

~~~
curl -sL https://rpm.nodesource.com/setup_12.x | sudo bash -
sudo dnf config-manager --set-enabled PowerTools
sudo dnf localinstall -y --nogpgcheck https://download1.rpmfusion.org/free/el/rpmfusion-free-release-8.noarch.rpm
sudo dnf install -y --nogpgcheck https://download1.rpmfusion.org/nonfree/el/rpmfusion-nonfree-release-8.noarch.rpm
sudo dnf install -y http://rpmfind.net/linux/epel/7/x86_64/Packages/s/SDL2-2.0.10-1.el7.x86_64.rpm
sudo dnf -y update
sudo dnf -y install git tmux zsh tar wget gcc gcc-c++ nodejs ffmpeg unzip make kernel-headers kernel-devel elfutils-devel elfutils-libelf-devel yum-utils htop cmake bzip2 pcsc-lite pcsc-lite-libs pcsc-lite-ccid nss-tools perl-ExtUtils-MakeMaker autoconf automake mariadb-server mariadb samba
~~~

## エディタのインストール

~~~
sudo yum-config-manager --add-repo=https://copr.fedorainfracloud.org/coprs/carlwgeorge/ripgrep/repo/epel-7/carlwgeorge-ripgrep-epel-7.repo
sudo dnf -y install nano ripgrep vim-enhanced
sudo pip3 install neovim
git clone https://github.com/noyuno/dotfiles
./dotfiles/bin/dfdeploy

vi

:call dein#install()
:q
~~~

## sudoの設定

~~~
sudo visudo

Defaults timestamp_timeout = 30
Defaults    secure_path = /sbin:/bin:/usr/sbin:/usr/bin:/usr/local/bin:/usr/local/sbin
~~~

## px4_drv

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

## カードリーダー

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

## libarib25

~~~
git clone https://github.com/stz2012/libarib25
cd libarib25
cmake .
make
sudo make install
echo '/usr/local/lib64' | sudo tee /etc/ld.so.conf.d/usr-local-lib64.conf
sudo ldconfig
~~~

## recpt1

~~~
git clone https://github.com/stz2012/recpt1
cd recpt1/recpt1
./autogen.sh
./configure --enable-b25
make
sudo make install
~~~

## チューナのテスト

~~~
sudo recpt1 --b25 --strip BS09_0 10 bs11.ts
sudo recpt1 --b25 --strip 18 10 18.ts
~~~

in client, type

~~~
scp tv:bs11.ts .
~~~

## Mirakurun

~~~
sudo npm install pm2 -g
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

## MariaDB

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

## セキュリティの設定

~~~
sudo setenforce 0

sudo firewall-cmd --zone=public --add-forward-port=port=80:proto=tcp:toport=8888 --permanent
sudo firewall-cmd --zone=public --add-forward-port=port=80:proto=udp:toport=8888 --permanent
sudo firewall-cmd --zone=public --add-service=http --permanent
sudo firewall-cmd --zone=public --add-port=8889/tcp --permanent
sudo firewall-cmd --zone=public --add-port=8889/udp --permanent
sudo firewall-cmd --permanent --zone=public --add-service=samba
sudo firewall-cmd --add-source=192.168.100.1 --zone=drop --permanent
sudo firewall-cmd --reload
sudo firewall-cmd --list-all
sudo firewall-cmd --list-all --zone=drop
~~~

## Samba

~~~
sudo nano /etc/samba/smb.conf
~~~

~~~
[global]
    dos charset = CP932
    unix charset = UTF-8
    workgroup = WORKGROUP
    server string = Intel NUC/CentOS 8 TV Server
    hosts allow = 192.168.100. localhost EXCEPT 192.168.100.1
    netbios name = tv
    dns proxy = no
    security = user
    map to guest = bad user
    printing = bsd
    printcap name = /dev/null
[tv]
    path = /data
    browsable = yes
    writable = yes
    guest ok = yes
    read only = no
    create mode = 0777
    directory mode = 0777
~~~

~~~
sudo mkdir -p /data/{ts,mp4}
sudo chmod -R 0777 /data
sudo chown -R nobody:nobody /data
sudo systemctl start smb
sudo systemctl start nmb
sudo systemctl enable smb
sudo systemctl enable nmb
~~~

Windows+R type `\\tv\` to connect

## EPGStation

~~~
git clone https://github.com/l3tnun/EPGStation.git
cd EPGStation
npm install
npm run build
cp config/config.sample.json config/config.json
cp config/operatorLogConfig.sample.json config/operatorLogConfig.json
cp config/serviceLogConfig.sample.json config/serviceLogConfig.json
~~~

config/config.json
~~~
    ...
    "dbType": "mysql",
    "mysql": {
        "host": "localhost",
        "port": 3306,
        "user": "noyuno",
        "password": "",
        "database": "epgstation"
    },
    "ffmpeg": "/usr/bin/ffmpeg",
    "ffprobe": "/usr/bin/ffprobe",
    "recorded": "/data/ts",
    "recordedFormat": "%YEAR%%MONTH%%DAY%-%HOUR%%MIN%-%CHNAME%-%TITLE%",
    ...
~~~

~~~
sudo pm2 start dist/server/index.js --name "epgstation"
sudo pm2 save
sudo pm2 logs epgstation
~~~

## バッチ

エンコードはバッチ処理で行う。
J5005のFHD H.264エンコード速度は1.31xで、リアルタイムエンコードは厳しいと思う。
別に急ぐこともないので、平日昼間にエンコードさせる。
また、エンコードが終わったTSを消す。

~~~
sudo ln -sfnv encbat-cron /etc/cron.d
~~~

## discord

## system backup

# トラブルシューティング

## カクカクする

ドライバーのせいでもソフトウェアのせいでもない。チューナのケーブル端子が外れやすい。きちんと挿すこと！

## Mirakurunが"Error: no available tuners"を吐く

recpt1を絶対パスで指定。sudoの`secure_path`に`/usr/local/bin`を入れても無意味。

## VLCで映像が乱れる

「ツール>設定>すべて」にチェック。「ビデオ>出力モジュール」の「ビデオ出力モジュール」が「Direct3D11ビデオ出力」になっていると乱れるので、「Direct3D9ビデオ出力」にする

## PM2が10分ごとに落ちる

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

## S/N比が低い

調査中
