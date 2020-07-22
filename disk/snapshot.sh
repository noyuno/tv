#!/bin/bash

set -e

hddsrc=hddsg0
data=data0
crypt=crypt0
dt=$(TZ=GMT date +@GMT-%Y.%m.%d-%H.%M.%S)

is_mounted() {
  dev=$1
  mpoint=$2
  if [ ! "$mpoint" ]; then
    mpoint=$dev
  fi
  mount | grep ^/dev/mapper/$dev\ on\ /mnt/$mpoint\ type\ xfs || echo ''
}
mounted_src_data="$(is_mounted $hddsrc-$data)"
mounted_src_crypt="$(is_mounted $hddsrc-$crypt-data $hddsrc-$crypt)"

# create history

create () {
  d=$1
  h=.snapshot
  echo creating history: $d/$h/$dt
  mkdir -p $d/$h/$dt
  command ls -1aU $d | grep -v -e '^\'$h'$' -e '^\.$' -e '^\..$' | xargs -IPLACE cp -al $d/PLACE $d/$h/$dt
  echo "snapshot $d: $(find $d/$h/$dt -type d -name '*' | wc -l) directories, $(find $d/$h/$dt -type f -name '*' | wc -l) files"
}

[ "$mounted_src_data" ] &&   create /mnt/$hddsrc-$data
[ "$mounted_src_crypt" ] &&  create /mnt/$hddsrc-$crypt
sync
