#!/bin/bash
set -e

cryptsetup open /dev/mapper/hddsg0-crypt0 hddsg0-crypt0-data
mount -onoatime,compress=zstd /dev/mapper/hddsg0-crypt0-data /mnt/hddsg0-crypt0
