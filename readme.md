# 1. テレビ視聴・録画環境構築

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
5. 録画データはEPGStation(Windows:VLC, iOS:VLC)とSambaでMP4を視聴
6. バックアップはシステムのみ行う。死活管理は行わない。録画エラーが発生したらDiscordで報告
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

~~~
sudo mount /dev/sdb1 /mnt
sudo rpm -ivh /mnt/NetworkManager-wifi* /mnt/wpa_supplicant*
sudo systemctl restart NetworkManager
nmcli d
~~~

SSHサーバはすでに立ち上がっているので、ネットワーク設定が終わったらすぐに接続できる。

## 6. ソフトウェアアップグレード

~~~
sudo dnf -y update
sudo reboot
~~~

## 7. カーネルバージョン固定

/etc/dnf/dnf.conf
~~~
excludepkgs=microcode_ctl kernel* docker-ce
~~~

/etc/sysconfig/kernel
~~~
UPDATEDEFAULT=no
~~~

## 8. 基本的なソフトウェアのインストール

~~~
curl -sL https://rpm.nodesource.com/setup_12.x | sudo bash -
sudo dnf config-manager --set-enabled PowerTools
sudo dnf localinstall -y --nogpgcheck https://download1.rpmfusion.org/free/el/rpmfusion-free-release-8.noarch.rpm
sudo dnf install -y --nogpgcheck https://download1.rpmfusion.org/nonfree/el/rpmfusion-nonfree-release-8.noarch.rpm
sudo dnf install -y http://rpmfind.net/linux/epel/7/x86_64/Packages/s/SDL2-2.0.10-1.el7.x86_64.rpm
sudo dnf -y update
sudo dnf -y install git tmux zsh tar wget gcc gcc-c++ nodejs ffmpeg unzip make kernel-headers kernel-devel elfutils-devel elfutils-libelf-devel yum-utils htop cmake bzip2 pcsc-lite pcsc-lite-libs pcsc-lite-ccid nss-tools perl-ExtUtils-MakeMaker autoconf automake mariadb-server mariadb samba chrony xfsdump gpac
sudo chsh -s /bin/zsh noyuno
~~~

## 9. エディタのインストール

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

## 10. sudoの設定

~~~
sudo visudo

Defaults timestamp_timeout = 30
Defaults    secure_path = /sbin:/bin:/usr/sbin:/usr/bin:/usr/local/bin:/usr/local/sbin
~~~

## 11. 時刻の設定

UTC非対応なので、JSTにする。

~~~
date
sudo systemctl start chronyd
sudo systemctl status chronyd
sudo systemctl enable chronyd
date
~~~

## 12. px4_drv

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

## 13. カードリーダー

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

## 14. libarib25

~~~
git clone https://github.com/stz2012/libarib25
cd libarib25
cmake .
make
sudo make install
echo '/usr/local/lib64' | sudo tee /etc/ld.so.conf.d/usr-local-lib64.conf
sudo ldconfig
~~~

## 15. recpt1

~~~
git clone https://github.com/stz2012/recpt1
cd recpt1/recpt1
./autogen.sh
./configure --enable-b25
make
sudo make install
~~~

## 16. チューナのテスト

~~~
sudo recpt1 --b25 --strip BS09_0 10 bs11.ts
sudo recpt1 --b25 --strip 18 10 18.ts
~~~

in client, type

~~~
scp m1:bs11.ts .
~~~

## 17. Mirakurun

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

## 18. MariaDB

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

## 19. セキュリティの設定

~~~
sudo setenforce 0
sudo nano /etc/sysconfig/selinux
~~~

~~~
SELINUX=disabled
~~~

~~~
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
sudo reboot
~~~

## 20. Samba

~~~
sudo nano /etc/fstab
~~~

~~~
/dev/mapper/cl_m1-r     /                       xfs     defaults        0 0
UUID=c1f041e1-2233-436f-a486-c2db9040482d /boot                   ext4    defaults        1 2
UUID=2971-857F          /boot/efi               vfat    umask=0077,shortname=winnt 0 2
/dev/mapper/cl_m1-data  /mnt/data               xfs     defaults        0 0
/dev/mapper/cl_m1-backup /mnt/backup            xfs     defaults        0 0
~~~

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
    netbios name = m1
    dns proxy = no
    security = user
    map to guest = bad user
    printing = bsd
    printcap name = /dev/null
    local master = yes
    os level = 200
[m1]
    path = /mnt/data
    browsable = yes
    writable = yes
    guest ok = yes
    read only = no
    create mode = 0777
    directory mode = 0777
~~~

~~~
sudo mkdir -p /mnt/data/{ts,mp4}
sudo chmod -R 0777 /mnt/data
sudo chown -R nobody:nobody /mnt/data
sudo systemctl start smb
sudo systemctl start nmb
sudo systemctl enable smb
sudo systemctl enable nmb
~~~

Windows+R type `\\m1\` to connect

## 21. FTP

iOSのInfuseからアクセスする。

~~~
dnf -y install vsftpd
sudo nano /etc/vsftpd/vsftpd.conf
~~~

~~~
anonymous_enable=YES
local_enable=YES
write_enable=NO
local_umask=022
dirmessage_enable=YES
xferlog_enable=YES
connect_from_port_20=YES
xferlog_std_format=YES
listen=NO
listen_ipv6=YES
pam_service_name=vsftpd
userlist_enable=YES
anon_root=/mnt/data
pasv_min_port=4000
pasv_max_port=4029
allow_writeable_chroot=YES
~~~

~~~
sudo firewall-cmd --zone=public --add-service=ftp --permanent
sudo firewall-cmd --zone=public --add-port=4000-4029/tcp --permanent
sudo firewall-cmd --reload
sudo systemctl start vsftpd
sudo systemctl status vsftpd
sudo systemctl enable vsftpd
~~~


## 21. EPGStation

~~~
git clone https://github.com/l3tnun/EPGStation.git
cd EPGStation
npm install
npm run build
cp config/operatorLogConfig.sample.json config/operatorLogConfig.json
cp config/serviceLogConfig.sample.json config/serviceLogConfig.json
cd
~~~

~~~
git clone https://github.com/noyuno/tv
./install
~~~

~~~
sudo pm2 start dist/server/index.js --name "epgstation"
sudo pm2 save
sudo pm2 logs epgstation
~~~


## 22. discord (IFTTT編)

### IFTTT

1. 右上の丸いボタンを押してCreateを押す。
2. 「This」ボタンを押して「Webhooks」と入力してクリックする。
3. 「Receive a web request」をクリック。
4. 「Event Name」に「tv」と入力し、「Create trigger」をクリック。
5. 「That」ボタンを押して「Webhooks」と入力してクリックする。
6. 「Make a web request」を押す。
7. 「URL」にDiscordのweb hook URLを入力する。MethodはPost。Content-Typeは「application/json」、Bodyに`{"content":"{{Value1}}"}`を入力する。

### テスト

https://ifttt.com/maker_webhooks に移動。右上の「Documentation」をクリック。
eventに「tv」と入力、value1に「test」と入力して「Test it」を押す。

### 設定

上記テストで表示されたキーを控える。

`.env`に`IFTTTKEY=(キー)`を入力。

## 22. Discord (notifyd編)

## 23. comskipでCMの区切りにチャプターを付ける

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

## 24. システムをS3にバックアップ

~~~
sudo chown -R root.wheel /mnt/backup
sudo chmod -R 775 /mnt/backup
sudo pip3 install awscli
aws configure
~~~

~~~
cd /mnt/backup
df -h > df
lvdisplay > lvdisplay
sudo xfsdump -l 0 - /dev/cl_m1/r | nice -n 10 pigz > root.gz
aws s3 cp df s3://noyuno-m1
aws s3 cp lvdisplay s3://noyuno-m1
/home/noyuno/tv/s3mpu noyuno-m1 root.gz
~~~

# 2. トラブルシューティング

## 1. カクカクする

ドライバーのせいでもソフトウェアのせいでもない。チューナのケーブル端子が外れやすい。きちんと挿すこと！

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
