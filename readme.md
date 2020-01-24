# 環境構築

## 要件

1. NUC7PJYH
2. PX4-W3U4
3. カードリーダー
4. CentOS 8

## Rufus で書き込み

[Rufus](https://rufus.ie/)

## インストーラを起動

- language: english
- keyboard: japanese
- timezone: Asia/Tokyo
- install: base only
- target: p(esp) /boot/efi, p(ext4) /boot, l(xfs) /
- hostname: tv.lan

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

~~~
sudo ln -sfnv encbat-cron /etc/cron.d
~~~

## Intel Compute Runtime / Media SDKをインストール

### Media Driver

~~~
sudo dnf install -y libtool libdrm-devel xorg-x11-server-Xorg xorg-x11-server-devel openbox libX11-devel mesa-libGL mesa-libGL-devel mesa-libGLU-devel redhat-lsb-core opus-devel yum-plugin-copr ocl-icd-devel
sudo yum copr enable jdanecki/intel-opencl -y
sudo yum install -y intel-opencl
~~~

libva

~~~
mkdir media-driver
cd media-driver
wget https://github.com/intel/libva/archive/2.6.1.tar.gz
tar xf 2.6.1.tar.gz libva-2.6.1
cd libva-2.6.1
./autogen.sh
make
sudo make install
echo '/usr/local/lib' | sudo tee /etc/ld.so.conf.d/usr-local-lib.conf
cd ..
~~~

Intel（R）Graphics Memory Management Library

~~~
wget https://github.com/intel/gmmlib/archive/intel-gmmlib-19.4.1.tar.gz
tar xf intel-gmmlib-19.4.1.tar.gz
cd  gmmlib-intel-gmmlib-19.4.1
mkdir build
cd build
cmake ..
make -j4
sudo make install
cd ..
~~~


Intel(R) Media Driver for VAAPI

~~~
wget https://github.com/intel/media-driver/archive/intel-media-19.4.0r.tar.gz
tar xf intel-media-19.4.0r.tar.gz
mkdir build_media
cd build_media
export PKG_CONFIG_PATH=/usr/lib/pkgconfig:/usr/lib64/pkgconfig:/usr/local/lib/pkgconfig:/usr/local/lib64/pkgconfig
#cmake ../media-driver-intel-media-19.4.0r 
cmake ../media-driver \
-DMEDIA_VERSION="2.0.0" \
-DBS_DIR_GMMLIB=$PWD/../gmmlib-intel-gmmlib-19.4.1/Source/GmmLib/ \
-DBS_DIR_COMMON=$PWD/../gmmlib-intel-gmmlib-19.4.1/Source/Common/ \
-DBS_DIR_INC=$PWD/../gmmlib-intel-gmmlib-19.4.1/Source/inc/ \
-DBS_DIR_MEDIA=$PWD/../media-driver-intel-media-19.4.0r \
-DINSTALL_DRIVER_SYSCONF=OFF ../media-driver-intel-media-19.4.0r 
make -j4
sudo make install
cd ..
export LIBVA_DRIVER_NAME=iHD
echo LIBVA_DRIVER_NAME=iHD |sudo tee -a /etc/environment
~~~

### Intel® Media SDK

Intel® Media SDK

~~~
wget https://github.com/Intel-Media-SDK/MediaSDK/releases/download/intel-mediasdk-19.4.0/MediaStack.tar.gz
tar xf MediaStack.tar.gz
cd MediaStack
sudo ./install_media.sh
sudo reboot
cd media-driver
~~~

libva-utils

~~~
wget https://github.com/intel/libva-utils/archive/2.6.0.tar.gz
tar xf 2.6.0.tar.gz libva-utils-2.6.0
cd $_
export PKG_CONFIG_PATH=$PKG_CONFIG_PATH:/opt/intel/mediasdk/lib64/pkgconfig
./autogen.sh
./configure
make
sudo make install
vainfo
~~~

## Ffmpegをインストール

~~~
sudo dnf install -y libaom-devel libass-devel fdk-aac-devel lame-devel libvorbis-devel x264-devel ocl-icd
cd
mkdir ffmpeg
cd ffmpeg
curl -O http://www.tortall.net/projects/yasm/releases/yasm-1.3.0.tar.gz
tar zxvf yasm-1.3.0.tar.gz
cd yasm-1.3.0
./configure
make -j$(nproc)
sudo make install
sudo ldconfig
cd ..
wget http://downloads.xiph.org/releases/theora/libtheora-1.1.1.tar.bz2
tar xf libtheora-1.1.1.tar.bz2
cd libtheora-1.1.1
sed -i 's/png_\(sizeof\)/\1/g' examples/png2theora.c
./autogen.sh
make
sudo make install

curl -O https://ffmpeg.org/releases/ffmpeg-4.2.2.tar.bz2
tar jxvf ffmpeg-4.2.2.tar.bz2
cd ffmpeg-4.2.2
PKG_CONFIG_PATH=/opt/intel/mediasdk/lib64/pkgconfig ./configure \
  --pkg-config-flags="--static" \
  --extra-cflags="-I/opt/intel/mediasdk/include" \
  --extra-ldflags="-L/opt/intel/mediasdk/lib64" \
  --extra-ldflags="-L/opt/intel/mediasdk/plugins" \
  --extra-libs="-lpthread -lm" \
  --enable-vaapi \
  --enable-libdrm \
  --enable-libtheora \
  --enable-opencl \
  --enable-gpl \
  --enable-libmfx \
  --enable-libaom \
  --enable-libass \
  --enable-libfdk-aac \
  --enable-libfreetype \
  --enable-libmp3lame \
  --enable-libopus \
  --enable-libvorbis \
  --enable-libx264 \
  --enable-nonfree \
  --enable-opencl
make -j4
sudo make install
/usr/local/bin/ffmpeg -hwaccels
> vaapi
> qsv
> drm
> opencl
~~~

## エンコードテスト

VAAPI

~~~
time ffmpeg -y -nostdin -vaapi_device /dev/dri/renderD128 -hwaccel vaapi -hwaccel_output_format vaapi -i bs11.ts -vf 'format=nv12|vaapi,hwupload' -vcodec h264_vaapi -acodec aac -strict -2 -ac 2 -ar 48000 -ab 192k -threads 0 bs11.mp4
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

[5ch同時録画・視聴 PCI-Express型地デジ・BS/CSマルチチューナーPX-MLT5PE 株式会社プレクス パソコン・パソコン周辺機器メーカー PLEX株式会社プレクス パソコン・パソコン周辺機器メーカー PLEX](http://www.plex-net.co.jp/support/tvtuner/)
より

~~~
動作保証CN値は？
地デジ:18以上
BS:8以上
CS:5以上
~~~

とあるので問題ない。

## OpenCL周りがよくわからん

- intel-opencl（別名compute-runtime、neoとも言う）: ドライバ?
- ocl-icd-devel（libOpenCL.soが入っている）: 汎用ライブラリ?
- media-driver: Video Acceleration API(VAAPI)の実装?
- Libva: Video Acceleration API(VAAPI)のユーザモードドライバ？ media-driverを動かすのに必要
- GmmLib: Intel Graphics Memory Management Library media-driverを動かすのに必要 
ffmpeg -hwaccel qsv -c:v mpeg2_qsv -i  -c:v h264_qsv -vf 'scale_qsv=1280:720' -q:v 23 -c:a copy output.mp4


## Ffmpegでエラーが出てエンコードできない

次のようにエンコードしようとしてもできない

~~~
ffmpeg -fflags +discardcorrupt -i bs11.ts -c:a copy -bsf:a aac_adtstoasc -c:v h264_qsv -y bs11.mp4

[AVBSFContext @ 0x3601600] Error parsing ADTS frame header!
Error applying bitstream filters to an output packet for stream #0:1.
[h264_qsv @ 0x35b7f00] Selected ratecontrol mode is unsupported
[h264_qsv @ 0x35b7f00] Low power mode is unsupported
[h264_qsv @ 0x35b7f00] Current frame rate is unsupported
[h264_qsv @ 0x35b7f00] Current picture structure is unsupported
[h264_qsv @ 0x35b7f00] Current resolution is unsupported
[h264_qsv @ 0x35b7f00] Current pixel format is unsupported
[h264_qsv @ 0x35b7f00] some encoding parameters are not supported by the QSV runtime. Please double check the input parameters.
Error initializing output stream 0:0 -- Error while opening encoder for output stream #0:0 - maybe incorrect parameters such as bit_rate, rate, width or height
Conversion failed!
~~~

Media Driverのコンパイルオプションをつぎのようにしなければならない。

~~~
cmake ../media-driver \
-DMEDIA_VERSION="2.0.0" \
-DBS_DIR_GMMLIB=$PWD/../gmmlib-intel-gmmlib-19.4.1/Source/GmmLib/ \
-DBS_DIR_COMMON=$PWD/../gmmlib-intel-gmmlib-19.4.1/Source/Common/ \
-DBS_DIR_INC=$PWD/../gmmlib-intel-gmmlib-19.4.1/Source/inc/ \
-DBS_DIR_MEDIA=$PWD/../media-driver-intel-media-19.4.0r \
-DINSTALL_DRIVER_SYSCONF=OFF ../media-driver-intel-media-19.4.0r 
~~~

また、Ffmpegのオプションを次のようにする

~~~
time ffmpeg -y -nostdin -vaapi_device /dev/dri/renderD128 -hwaccel vaapi -hwaccel_output_format vaapi -i bs11.ts -vf 'format=nv12|vaapi,hwupload' -vcodec h264_vaapi -acodec aac -strict -2 -ac 2 -ar 48000 -ab 192k -threads 0 bs11.mp4
~~~

## パフォーマンス

~~~
[noyuno@m1:~] $ sudo recpt1 --b25 --strip BS09_0 60 bs11.ts
using B25...
enable B25 strip
pid = 23937
C/N = 15.596817dB
Recording...
Recorded 60sec
[noyuno@m1:~] $ time ffmpeg -y -nostdin -vaapi_device /dev/dri/renderD128 -hwaccel vaapi -hwaccel_output_format vaapi -i bs11.ts -vf 'format=nv12|vaapi,hwupload' -vcodec h264_vaapi -acodec aac -strict -2 -ac 2 -ar 48000 -ab 192k -threads 0 bs11.mp4
ffmpeg version 4.2.2 Copyright (c) 2000-2019 the FFmpeg developers
  built with gcc 8 (GCC)
  configuration: --pkg-config-flags=--static --extra-cflags=-I/opt/intel/mediasdk/include --extra-ldflags=-L/opt/intel/mediasdk/lib64 --extra-ldflags=-L/opt/intel/mediasdk/plugins --extra-libs='-lpthread -lm' --enable-vaapi --enable-libdrm --enable-libtheora --enable-opencl --enable-gpl --enable-libmfx --enable-libaom --enable-libass --enable-libfdk-aac --enable-libfreetype --enable-libmp3lame --enable-libopus --enable-libvorbis --enable-libx264 --enable-nonfree --enable-opencl
  libavutil      56. 31.100 / 56. 31.100
  libavcodec     58. 54.100 / 58. 54.100
  libavformat    58. 29.100 / 58. 29.100
  libavdevice    58.  8.100 / 58.  8.100
  libavfilter     7. 57.100 /  7. 57.100
  libswscale      5.  5.100 /  5.  5.100
  libswresample   3.  5.100 /  3.  5.100
  libpostproc    55.  5.100 / 55.  5.100
[aac @ 0x33bce00] Multiple frames in a packet.
[aac @ 0x33bce00] Sample rate index in program config element does not match the sample rate index configured by the container.
[aac @ 0x33bce00] decode_pce: Input buffer exhausted before END element found
[mpeg2video @ 0x33bbc40] Invalid frame dimensions 0x0.
    Last message repeated 5 times
[mpegts @ 0x3392980] start time for stream 2 is not set in estimate_timings_from_pts
[mpegts @ 0x3392980] PES packet size mismatch
Input #0, mpegts, from 'bs11.ts':
  Duration: 00:01:00.14, start: 80528.913556, bitrate: 19048 kb/s
  Program 211
    Stream #0:0[0x140]: Video: mpeg2video (Main) ([2][0][0][0] / 0x0002), yuv420p(tv, bt709, top first), 1920x1080 [SAR 1:1 DAR 16:9], 29.97 fps, 29.97 tbr, 90k tbn, 59.94 tbc
    Stream #0:1[0x141]: Audio: aac (LC) ([15][0][0][0] / 0x000F), 48000 Hz, stereo, fltp, 249 kb/s
    Stream #0:2[0x138]: Data: bin_data ([6][0][0][0] / 0x0006)
Stream mapping:
  Stream #0:0 -> #0:0 (mpeg2video (native) -> h264 (h264_vaapi))
  Stream #0:1 -> #0:1 (aac (native) -> aac (native))
[aac @ 0x3447100] Multiple frames in a packet.
[aac @ 0x3447100] Sample rate index in program config element does not match the sample rate index configured by the container.
[aac @ 0x3447100] decode_pce: Input buffer exhausted before END element found
Error while decoding stream #0:1: Invalid data found when processing input
[h264_vaapi @ 0x3440cc0] No quality level set; using default (20).
Output #0, mp4, to 'bs11.mp4':
  Metadata:
    encoder         : Lavf58.29.100
    Stream #0:0: Video: h264 (h264_vaapi) (High) (avc1 / 0x31637661), vaapi_vld, 1920x1080 [SAR 1:1 DAR 16:9], q=-1--1, 29.97 fps, 30k tbn, 29.97 tbc
    Metadata:
      encoder         : Lavc58.54.100 h264_vaapi
    Stream #0:1: Audio: aac (LC) (mp4a / 0x6134706D), 48000 Hz, stereo, fltp, 192 kb/s
    Metadata:
      encoder         : Lavc58.54.100 aac
[mpegts @ 0x3392980] PES packet size mismatchme=00:00:57.92 bitrate=7675.4kbits/s dup=19 drop=0 speed=6.02x
[aac @ 0x3447100] decode_band_types: Input buffer exhausted before END element found
Error while decoding stream #0:1: Invalid data found when processing input
frame= 1802 fps=181 q=-0.0 Lsize=   56741kB time=00:01:00.06 bitrate=7739.3kbits/s dup=20 drop=0 speed=6.02x
video:55275kB audio:1404kB subtitle:0kB other streams:0kB global headers:0kB muxing overhead: 0.107944%
[aac @ 0x3a57800] Qavg: 447.127

real    0m10.035s
user    0m1.632s
sys     0m0.361s
[noyuno@m1:~] $ ls -l bs11.*
-rw-rw-r--  1 noyuno noyuno  56M Jan 24 13:15 bs11.mp4
-rw-r--r--. 1 root   root   137M Jan 24 13:15 bs11.ts
~~~

| 項目 | 値              |
|-----|-----------------|
| 速度 | 2.99倍         |
| ファイルサイズ | 40.8% |

