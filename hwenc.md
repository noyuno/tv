# ハードウェアエンコード


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

VAAPIオプション一覧

~~~
ffmpeg -h encoder=h264_vaapi
~~~


## エンコードテスト

**録画**

~~~
sudo recpt1 --b25 --strip BS09_0 60 bs11.ts
~~~

**VAAPI**

プログレッシブになる

~~~
time ffmpeg -y -nostdin -vaapi_device /dev/dri/renderD128 -hwaccel vaapi -hwaccel_output_format vaapi -i bs11.ts -vf 'format=nv12|vaapi,hwupload' -vcodec h264_vaapi -acodec aac -strict -2 -ac 2 -ar 48000 -ab 192k -threads 0 bs11.mp4
~~~

**QSV**

動かし方わからん

**CPU**

~~~
time ffmpeg -y -nostdin -i bs11.ts -vcodec h264 -acodec aac -strict -2 -ac 2 -ar 48000 -ab 192k -threads 0 bs11-soft.mp4
~~~

## EPGStationを再設定

`EPGStation/config.json`を参照

# トラブルシューティング

## OpenCL周り

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
[noyuno@m1:~] $ time ffmpeg -y -nostdin -i bs11.ts -vcodec h264 -acodec aac -strict -2 -ac 2 -ar 48000 -ab 192k -threads 0 bs11-soft.mp4
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
[aac @ 0x2b18840] Multiple frames in a packet.
[aac @ 0x2b18840] Sample rate index in program config element does not match the sample rate index configured by the container.
[aac @ 0x2b18840] decode_pce: Input buffer exhausted before END element found
[mpeg2video @ 0x2b17680] Invalid frame dimensions 0x0.
    Last message repeated 5 times
[mpegts @ 0x2b125c0] start time for stream 2 is not set in estimate_timings_from_pts
[mpegts @ 0x2b125c0] PES packet size mismatch
Input #0, mpegts, from 'bs11.ts':
  Duration: 00:01:00.14, start: 80528.913556, bitrate: 19048 kb/s
  Program 211
    Stream #0:0[0x140]: Video: mpeg2video (Main) ([2][0][0][0] / 0x0002), yuv420p(tv, bt709, top first), 1920x1080 [SAR 1:1 DAR 16:9], 29.97 fps, 29.97 tbr, 90k tbn, 59.94 tbc
    Stream #0:1[0x141]: Audio: aac (LC) ([15][0][0][0] / 0x000F), 48000 Hz, stereo, fltp, 249 kb/s
    Stream #0:2[0x138]: Data: bin_data ([6][0][0][0] / 0x0006)
Stream mapping:
  Stream #0:0 -> #0:0 (mpeg2video (native) -> h264 (libx264))
  Stream #0:1 -> #0:1 (aac (native) -> aac (native))
[aac @ 0x2b6f7c0] Multiple frames in a packet.
[aac @ 0x2b6f7c0] Sample rate index in program config element does not match the sample rate index configured by the container.
[aac @ 0x2b6f7c0] decode_pce: Input buffer exhausted before END element found
Error while decoding stream #0:1: Invalid data found when processing input
[libx264 @ 0x2ba1f80] using SAR=1/1
[libx264 @ 0x2ba1f80] using cpu capabilities: MMX2 SSE2Fast SSSE3 SSE4.2 AVX FMA3 BMI2 AVX2
[libx264 @ 0x2ba1f80] profile High, level 4.0, 4:2:0, 8-bit
[libx264 @ 0x2ba1f80] 264 - core 157 r2980 34c06d1 - H.264/MPEG-4 AVC codec - Copyleft 2003-2019 - http://www.videolan.org/x264.html - options: cabac=1 ref=3 deblock=1:0:0 analyse=0x3:0x113 me=hex subme=7 psy=1 psy_rd=1.00:0.00 mixed_ref=1 me_range=16 chroma_me=1 trellis=1 8x8dct=1 cqm=0 deadzone=21,11 fast_pskip=1 chroma_qp_offset=-2 threads=6 lookahead_threads=1 sliced_threads=0 nr=0 decimate=1 interlaced=0 bluray_compat=0 constrained_intra=0 bframes=3 b_pyramid=2 b_adapt=1 b_bias=0 direct=1 weightb=1 open_gop=0 weightp=2 keyint=250 keyint_min=25 scenecut=40 intra_refresh=0 rc_lookahead=40 rc=crf mbtree=1 crf=23.0 qcomp=0.60 qpmin=0 qpmax=69 qpstep=4 ip_ratio=1.40 aq=1:1.00
Output #0, mp4, to 'bs11-soft.mp4':
  Metadata:
    encoder         : Lavf58.29.100
    Stream #0:0: Video: h264 (libx264) (avc1 / 0x31637661), yuv420p, 1920x1080 [SAR 1:1 DAR 16:9], q=-1--1, 29.97 fps, 30k tbn, 29.97 tbc
    Metadata:
      encoder         : Lavc58.54.100 libx264
[mpegts @ 0x2b125c0] PES packet size mismatchme=00:00:59.30 bitrate=4314.1kbits/s dup=19 drop=0 speed=0.753x
[mpeg2video @ 0x2b70bc0] invalid cbp -1 at 42 37
[mpeg2video @ 0x2b70bc0] Warning MVs not available
[mpeg2video @ 0x2b70bc0] concealing 3720 DC, 3720 AC, 3720 MV errors in B frame
bs11.ts: corrupt decoded frame in stream 0
[aac @ 0x2b6f7c0] decode_band_types: Input buffer exhausted before END element found
Error while decoding stream #0:1: Invalid data found when processing input
frame= 1802 fps= 22 q=-1.0 Lsize=   32263kB time=00:01:00.02 bitrate=4403.0kbits/s dup=20 drop=0 speed=0.742x
video:30794kB audio:1404kB subtitle:0kB other streams:0kB global headers:0kB muxing overhead: 0.200249%
[libx264 @ 0x2ba1f80] frame I:14    Avg QP:18.95  size:116078
[libx264 @ 0x2ba1f80] frame P:500   Avg QP:22.11  size: 34320
[libx264 @ 0x2ba1f80] frame B:1288  Avg QP:24.14  size:  9897
[libx264 @ 0x2ba1f80] consecutive B-frames:  1.1%  2.1% 26.5% 70.4%
[libx264 @ 0x2ba1f80] mb I  I16..4: 20.4% 73.1%  6.5%
[libx264 @ 0x2ba1f80] mb P  I16..4:  5.4% 10.8%  0.5%  P16..4: 45.8%  9.9%  6.3%  0.0%  0.0%    skip:21.4%
[libx264 @ 0x2ba1f80] mb B  I16..4:  0.6%  1.0%  0.0%  B16..8: 36.8%  2.1%  0.3%  direct: 3.9%  skip:55.3%  L0:44.7% L1:51.2% BI: 4.2%
[libx264 @ 0x2ba1f80] 8x8 transform intra:65.0% inter:89.4%
[libx264 @ 0x2ba1f80] coded y,uvDC,uvAC intra: 34.9% 61.9% 11.4% inter: 10.5% 23.2% 0.3%
[libx264 @ 0x2ba1f80] i16 v,h,dc,p: 35% 29% 14% 22%
[libx264 @ 0x2ba1f80] i8 v,h,dc,ddl,ddr,vr,hd,vl,hu: 23% 17% 38%  3%  4%  4%  3%  4%  3%
[libx264 @ 0x2ba1f80] i4 v,h,dc,ddl,ddr,vr,hd,vl,hu: 24% 20% 14%  5% 10% 10%  7%  6%  4%
[libx264 @ 0x2ba1f80] i8c dc,h,v,p: 48% 24% 24%  4%
[libx264 @ 0x2ba1f80] Weighted P-Frames: Y:0.0% UV:0.0%
[libx264 @ 0x2ba1f80] ref P L0: 55.5% 10.1% 24.7%  9.7%
[libx264 @ 0x2ba1f80] ref B L0: 83.0% 14.1%  2.9%
[libx264 @ 0x2ba1f80] ref B L1: 95.4%  4.6%
[libx264 @ 0x2ba1f80] kb/s:4195.49
[aac @ 0x2c86100] Qavg: 447.127

real    1m20.910s
user    5m4.477s
sys     0m0.672s
[noyuno@m1:~] $ ls -l bs11*
-rw-rw-r--  1 noyuno noyuno  56M Jan 24 13:15 bs11.mp4
-rw-rw-r--  1 noyuno noyuno  32M Jan 24 13:29 bs11-soft.mp4
-rw-r--r--. 1 root   root   137M Jan 24 13:15 bs11.ts

~~~

| エンコード | 速度（実時間比） | ファイルサイズ |
|-----|-----------|------|
| CPU | 0.740倍 | 23.4% |
| QSV(VAAPI) | 2.99倍 | 40.9% |

CPUエンコードはリアルタイムエンコード不可。QSV（VAAPI）エンコードはリアルタイムエンコード可能。

## VAAPIで見ると歪む

仕様。なので現在ハードウェアエンコードはしていない。
